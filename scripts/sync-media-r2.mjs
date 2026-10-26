import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { AwsClient } from "aws4fetch";
import { thumbnailExtensions } from "../lib/logo-thumbnail-path.mjs";

const contentTypes = {
  ".png": "image/png", ".svg": "image/svg+xml", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".avif": "image/avif", ".tif": "image/tiff", ".tiff": "image/tiff",
};

const digest = (algorithm, bytes, encoding = "hex") => createHash(algorithm).update(bytes).digest(encoding);

export async function inventoryMedia(root = process.cwd()) {
  const directory = path.join(root, "public", "media");
  async function walk(folder) {
    const nested = await Promise.all((await readdir(folder, { withFileTypes: true })).map(async (entry) => {
      if (entry.name.startsWith(".")) return [];
      const filename = path.join(folder, entry.name);
      if (entry.isDirectory()) return walk(filename);
      return entry.isFile() && thumbnailExtensions.has(path.extname(entry.name).toLowerCase()) ? [filename] : [];
    }));
    return nested.flat();
  }
  return (await walk(directory)).sort().map((filename) => ({
    filename,
    key: `media/${path.relative(directory, filename).split(path.sep).join("/")}`,
    contentType: contentTypes[path.extname(filename).toLowerCase()],
  }));
}

export function r2Configuration(env = process.env) {
  const required = ["R2_ACCOUNT_ID", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"];
  const missing = required.filter((name) => !env[name]?.trim());
  if (missing.length) throw new Error(`Missing repository secrets: ${missing.join(", ")}.`);
  if (!/^[a-f0-9]{32}$/i.test(env.R2_ACCOUNT_ID.trim())) throw new Error("R2_ACCOUNT_ID must be the 32-character Cloudflare Account ID.");
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(env.R2_BUCKET.trim())) throw new Error("R2_BUCKET is not a valid bucket name.");
  const endpoint = env.R2_ENDPOINT?.trim() || `https://${env.R2_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com`;
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash
      || !new RegExp(`^${env.R2_ACCOUNT_ID.trim()}(?:\\.(?:eu|us|fedramp))?\\.r2\\.cloudflarestorage\\.com$`, "i").test(url.hostname)
      || url.pathname !== "/") {
    throw new Error("R2_ENDPOINT must be this account's HTTPS R2 S3 endpoint.");
  }
  return {
    endpoint: url.origin,
    bucket: env.R2_BUCKET.trim(),
    accessKeyId: env.R2_ACCESS_KEY_ID.trim(),
    secretAccessKey: env.R2_SECRET_ACCESS_KEY.trim(),
  };
}

export function createR2Client(config) {
  const signer = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3", region: "auto", retries: 0,
  });
  return async (method, key, headers = {}, body) => {
    const segments = [config.bucket, ...key.split("/")];
    const objectUrl = `${config.endpoint}/${segments.map(encodeURIComponent).join("/")}`;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const request = await signer.sign(objectUrl, { method, headers, ...(body === undefined ? {} : { body }) });
        const response = await fetch(request, { signal: AbortSignal.timeout(60_000), redirect: "error" });
        if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 3) return response;
        await response.body?.cancel();
      } catch {
        if (attempt === 3) throw new Error(`R2 ${method} failed for ${key}; request details are omitted to protect credentials.`);
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
  };
}

async function requireStatus(response, method, key) {
  if (response.ok) return;
  await response.body?.cancel();
  throw new Error(`R2 ${method} returned HTTP ${response.status} for ${key}. Check the bucket, endpoint and token permissions.`);
}

export async function syncMedia({ root = process.cwd(), request, log = console.log, concurrency = 12, useManifest = false, verifyAll = false } = {}) {
  const files = await inventoryMedia(root);
  if (!files.length) throw new Error("No source media found; synchronization stopped.");
  const originals = files.filter((file) => !file.key.startsWith("media/logo-thumbnails/"));
  const thumbnails = files.filter((file) => file.key.startsWith("media/logo-thumbnails/"));
  if (!thumbnails.length) throw new Error("No thumbnails found; run the thumbnail generator first.");
  const summary = {
    files: files.length, originals: originals.length, thumbnails: thumbnails.length,
    bytes: 0, uploaded: 0, reused: 0, verifiedDownloads: 0,
  };
  const manifest = new Array(files.length);
  let inventoryCursor = 0;
  const workers = Math.max(1, Math.min(16, concurrency));
  await Promise.all(Array.from({ length: workers }, async () => {
    while (inventoryCursor < files.length) {
      const index = inventoryCursor++;
      const bytes = await readFile(files[index].filename);
      manifest[index] = { key: files[index].key, bytes: bytes.length, sha256: digest("sha256", bytes) };
    }
  }));
  const manifestSha256 = digest("sha256", JSON.stringify(manifest));
  const markerKey = "_ppdb/media-sync.json";
  if (useManifest && !verifyAll) {
    const previous = await request("GET", markerKey);
    if (previous.ok) {
      let marker;
      try { marker = await previous.json(); } catch { marker = null; }
      if (marker?.version === 1 && marker.manifestSha256 === manifestSha256 && marker.files === files.length) {
        log(`R2 media manifest unchanged; ${files.length} files were already synchronized.`);
        return { ...summary, bytes: manifest.reduce((sum, item) => sum + item.bytes, 0), reused: files.length, cached: true, manifestSha256, manifest };
      }
    } else if (previous.status !== 404) {
      await requireStatus(previous, "GET", markerKey);
    } else await previous.body?.cancel();
  }
  let cursor = 0;
  let completed = 0;
  let stopped = false;
  const failures = [];
  async function next() {
    while (!stopped && cursor < files.length) {
      const index = cursor++;
      const file = files[index];
      try {
        const bytes = await readFile(file.filename);
        const sha256 = digest("sha256", bytes);
        if (sha256 !== manifest[index].sha256 || bytes.length !== manifest[index].bytes) throw new Error(`Source media changed during synchronization: ${file.key}. Run it again.`);
        const md5 = digest("md5", bytes);
        const head = await request("HEAD", file.key);
        const matches = head.ok
          && Number(head.headers.get("content-length")) === bytes.length
          && head.headers.get("x-amz-meta-sha256") === sha256
          && head.headers.get("content-type") === file.contentType;
        if (!head.ok && head.status !== 404) await requireStatus(head, "HEAD", file.key);
        await head.body?.cancel();
        if (matches) {
          summary.reused++;
        } else {
          const put = await request("PUT", file.key, {
            "content-type": file.contentType,
            "content-md5": digest("md5", bytes, "base64"),
            "cache-control": "public, max-age=3600",
            "x-amz-meta-sha256": sha256,
          }, bytes);
          await requireStatus(put, "PUT", file.key);
          const etag = put.headers.get("etag")?.replaceAll('"', "");
          await put.body?.cancel();
          if (etag && etag !== md5) throw new Error(`R2 upload checksum differs for ${file.key}.`);
          // Verify actual remote bytes, rather than trusting metadata alone.
          const downloaded = await request("GET", file.key);
          await requireStatus(downloaded, "GET", file.key);
          const remote = new Uint8Array(await downloaded.arrayBuffer());
          if (remote.length !== bytes.length || digest("sha256", remote) !== sha256) {
            throw new Error(`R2 download checksum differs for ${file.key}.`);
          }
          summary.uploaded++;
          summary.verifiedDownloads++;
        }
        summary.bytes += bytes.length;
        manifest[index] = { key: file.key, bytes: bytes.length, sha256 };
        completed++;
        if (completed % 250 === 0 || completed === files.length) log(`R2 media: ${completed}/${files.length} checked; ${summary.uploaded} uploaded, ${summary.reused} reused.`);
      } catch (error) {
        stopped = true;
        failures.push(error);
      }
    }
  }
  await Promise.all(Array.from({ length: workers }, () => next()));
  if (failures.length) throw failures[0];
  if (useManifest) {
    const bytes = Buffer.from(JSON.stringify({ version: 1, manifestSha256, files: files.length }));
    const marker = await request("PUT", markerKey, { "content-type": "application/json", "cache-control": "no-store", "content-md5": digest("md5", bytes, "base64") }, bytes);
    await requireStatus(marker, "PUT", markerKey);
    await marker.body?.cancel();
  }
  return { ...summary, manifestSha256, manifest };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const config = r2Configuration();
    const report = await syncMedia({ request: createR2Client(config), useManifest: true, verifyAll: process.argv.includes("--verify-all") });
    const output = path.resolve("outputs/r2-media-sync.json");
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify({ sourceCommit: process.env.GITHUB_SHA ?? null, ...report }, null, 2)}\n`);
    const { manifest, ...summary } = report;
    console.log(`R2_MEDIA_SYNC_RESULT=${JSON.stringify(summary)}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "R2 media synchronization failed.");
    process.exitCode = 1;
  }
}
