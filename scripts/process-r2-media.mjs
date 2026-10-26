import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createLogoThumbnail, thumbnailSettingsVersion } from "../lib/logo-thumbnail.mjs";
import { thumbnailExtensions, indexThumbnailPath } from "../lib/logo-thumbnail-path.mjs";
import { createR2Client, r2Configuration, requireR2Status } from "../lib/r2-client.mjs";

const originalsPrefix = "media/logos/";
const thumbnailsPrefix = "media/logo-thumbnails/logos/";
const stateKey = "_ppdb/logo-thumbnails.json";
const digest = (algorithm, bytes, encoding = "hex") => createHash(algorithm).update(bytes).digest(encoding);
const etag = value => value?.replace(/^"|"$/g, "") || null;
const xmlText = value => value.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi, token => {
  const entities = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };
  return entities[token] ?? String.fromCodePoint(parseInt(token.slice(2, -1).replace(/^x/i, ""), /^&#x/i.test(token) ? 16 : 10));
});
const tag = (xml, name) => xmlText(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(xml)?.[1] ?? "");
const thumbnailKey = key => indexThumbnailPath(`/${key}`)?.slice(1);

export function parseObjectListing(xml) {
  if (!/<ListBucketResult(?:\s|>)/.test(xml) || !["true", "false"].includes(tag(xml, "IsTruncated"))) throw new Error("R2 returned an invalid object listing.");
  const encoded = tag(xml, "EncodingType") === "url";
  const objects = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)].map(([, item]) => {
    const key = encoded ? decodeURIComponent(tag(item, "Key")) : tag(item, "Key");
    const sizeText = tag(item, "Size");
    const entry = { key, bytes: Number(sizeText), etag: etag(tag(item, "ETag")) };
    if (!key || !/^\d+$/.test(sizeText) || !Number.isSafeInteger(entry.bytes) || !entry.etag) throw new Error("R2 returned an incomplete object listing.");
    return entry;
  });
  return { objects, truncated: tag(xml, "IsTruncated") === "true", cursor: tag(xml, "NextContinuationToken") || null };
}

export async function listR2Objects(request, prefix) {
  const objects = new Map();
  const cursors = new Set();
  let cursor;
  do {
    const response = await request("GET", "", {}, undefined, { "list-type": "2", "encoding-type": "url", prefix, "max-keys": "1000", "continuation-token": cursor });
    await requireR2Status(response, "LIST", prefix);
    const page = parseObjectListing(await response.text());
    for (const object of page.objects) {
      if (!object.key.startsWith(prefix) || objects.has(object.key)) throw new Error(`R2 listing contains an unexpected or duplicate key: ${object.key}`);
      objects.set(object.key, object);
    }
    if (!page.truncated) return objects;
    if (!page.cursor || cursors.has(page.cursor)) throw new Error("R2 pagination did not advance; processing stopped.");
    cursors.add(page.cursor);
    cursor = page.cursor;
  } while (cursor);
  throw new Error("R2 pagination ended before all objects were listed.");
}

async function download(request, key, expected) {
  const response = await request("GET", key);
  await requireR2Status(response, "GET", key);
  const version = etag(response.headers.get("etag"));
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!version || (expected && (version !== expected.etag || bytes.length !== expected.bytes))) throw new Error(`R2 object changed during processing: ${key}. Run the action again.`);
  return { bytes, etag: version, sha256: digest("sha256", bytes) };
}

async function putVerified(request, key, bytes, headers) {
  const response = await request("PUT", key, { ...headers, "content-md5": digest("md5", bytes, "base64"), "x-amz-meta-sha256": digest("sha256", bytes) }, bytes);
  await requireR2Status(response, "PUT", key);
  await response.body?.cancel();
  const remote = await download(request, key);
  if (!remote.bytes.equals(bytes)) throw new Error(`R2 upload verification failed for ${key}.`);
  return remote;
}

async function mapConcurrent(items, concurrency, action) {
  let cursor = 0;
  let failure;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (!failure && cursor < items.length) {
      const index = cursor++;
      try { await action(items[index], index); } catch (error) { failure ??= error; }
    }
  }));
  if (failure) throw failure;
}

export async function verifyMigrationInventory({ request, baseline, log = console.log }) {
  if (baseline.version !== 1 || !Array.isArray(baseline.files) || !baseline.files.length) throw new Error("Invalid R2 migration inventory.");
  const verified = new Map();
  let completed = 0;
  let bytes = 0;
  await mapConcurrent(baseline.files, 12, async file => {
    if ((!file.key.startsWith(originalsPrefix) && !file.key.startsWith(thumbnailsPrefix)) || !/^[a-f\d]{64}$/.test(file.sha256)) throw new Error("Unexpected entry in the migration inventory.");
    const remote = await download(request, file.key);
    if (remote.bytes.length !== file.bytes || remote.sha256 !== file.sha256) throw new Error(`R2 migration checksum differs for ${file.key}; GitHub originals must be retained.`);
    verified.set(file.key, { etag: remote.etag, bytes: file.bytes, sha256: remote.sha256 });
    bytes += file.bytes;
    if (++completed % 250 === 0 || completed === baseline.files.length) log(`R2 archive verification: ${completed}/${baseline.files.length} files match SHA-256.`);
  });
  const entries = {};
  for (const [key, source] of verified) {
    if (!key.startsWith(originalsPrefix)) continue;
    const thumbnail = verified.get(thumbnailKey(key));
    if (!thumbnail) throw new Error(`Missing verified thumbnail for ${key}.`);
    entries[key] = { ...source, thumbnailEtag: thumbnail.etag, thumbnailBytes: thumbnail.bytes, thumbnailSha256: thumbnail.sha256 };
  }
  const report = { files: completed, originals: Object.keys(entries).length, thumbnails: completed - Object.keys(entries).length, bytes, inventorySha256: digest("sha256", JSON.stringify(baseline)), verifiedAt: new Date().toISOString() };
  await putVerified(request, "_ppdb/github-removal-verification.json", Buffer.from(JSON.stringify(report)), { "content-type": "application/json", "cache-control": "no-store" });
  log(`R2_MIGRATION_RESULT=${JSON.stringify(report)}`);
  return { state: { version: 1, settingsVersion: baseline.settingsVersion, entries }, report };
}

export async function processR2Media({ request, verifyAll = false, seed, log = console.log } = {}) {
  // Serialize this action with all other media jobs through workflow concurrency.
  let previous = seed;
  if (!previous) {
    const response = await request("GET", stateKey);
    if (response.status === 404) { await response.body?.cancel(); previous = { entries: {} }; }
    else {
      await requireR2Status(response, "GET", stateKey);
      previous = await response.json();
      if (previous.version !== 1 || !previous.entries || typeof previous.entries !== "object" || Array.isArray(previous.entries)) throw new Error("Invalid R2 thumbnail manifest; processing stopped.");
    }
  }
  const originals = await listR2Objects(request, originalsPrefix);
  const thumbnails = await listR2Objects(request, thumbnailsPrefix);
  const sources = [...originals.values()].filter(file => thumbnailExtensions.has(path.extname(file.key).toLowerCase()) && !file.key.split("/").some(segment => segment.startsWith(".")));
  if (!sources.length) throw new Error("No logo originals found in R2 under media/logos/; publishing stopped.");
  const entries = {};
  const summary = { originals: sources.length, generated: 0, reused: 0, verifiedOriginals: 0, verifiedThumbnails: 0 };
  await mapConcurrent(sources, 4, async file => {
    const key = thumbnailKey(file.key);
    const old = previous.entries[file.key];
    const thumb = thumbnails.get(key);
    const same = previous.settingsVersion === thumbnailSettingsVersion && old?.etag === file.etag && old.bytes === file.bytes
      && thumb && old.thumbnailEtag === thumb.etag && old.thumbnailBytes === thumb.bytes;
    if (same && !verifyAll) { entries[file.key] = old; summary.reused++; return; }
    const source = await download(request, file.key, file);
    summary.verifiedOriginals++;
    if (verifyAll && old?.etag === file.etag && source.sha256 !== old.sha256) throw new Error(`R2 archive checksum differs for ${file.key}.`);
    if (same) {
      const preview = await download(request, key, thumb);
      if (source.sha256 !== old.sha256 || preview.sha256 !== old.thumbnailSha256) throw new Error(`R2 archive checksum differs for ${file.key}.`);
      summary.verifiedThumbnails++;
      entries[file.key] = old;
      summary.reused++;
      return;
    }
    const output = await createLogoThumbnail(source.bytes);
    const preview = await putVerified(request, key, output, { "content-type": "image/webp", "cache-control": "public, max-age=3600", "x-amz-meta-source-sha256": source.sha256 });
    entries[file.key] = { etag: source.etag, bytes: source.bytes.length, sha256: source.sha256, thumbnailEtag: preview.etag, thumbnailBytes: output.length, thumbnailSha256: preview.sha256 };
    summary.generated++;
    summary.verifiedThumbnails++;
  });
  const ordered = Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
  const state = { version: 1, settingsVersion: thumbnailSettingsVersion, entries: ordered };
  if (seed || JSON.stringify(state) !== JSON.stringify(previous)) {
    await putVerified(request, stateKey, Buffer.from(JSON.stringify(state)), { "content-type": "application/json", "cache-control": "no-store" });
  }
  log(`R2_MEDIA_RESULT=${JSON.stringify(summary)}`);
  return { ...summary, manifestSha256: digest("sha256", JSON.stringify(state)) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const request = createR2Client(r2Configuration());
    const at = process.argv.indexOf("--verify-migration");
    const migration = at === -1 ? null : await verifyMigrationInventory({ request, baseline: JSON.parse(await readFile(process.argv[at + 1], "utf8")) });
    const summary = await processR2Media({ request, seed: migration?.state, verifyAll: process.argv.includes("--verify-all") });
    await mkdir("outputs", { recursive: true });
    await writeFile("outputs/r2-media-processing.json", `${JSON.stringify({ sourceCommit: process.env.GITHUB_SHA ?? null, migration: migration?.report ?? null, ...summary }, null, 2)}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "R2 media processing failed.");
    process.exitCode = 1;
  }
}
