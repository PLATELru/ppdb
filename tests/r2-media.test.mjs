import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { inventoryMedia, r2Configuration, syncMedia } from "../scripts/sync-media-r2.mjs";

test("media synchronization verifies remote bytes, resumes unchanged files and preserves sources", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ppdb-r2-"));
  const originals = path.join(root, "public/media/logos3");
  const thumbnails = path.join(root, "public/media/logo-thumbnails/logos3");
  await mkdir(originals, { recursive: true });
  await mkdir(thumbnails, { recursive: true });
  await writeFile(path.join(originals, "party.svg"), "original bytes");
  await writeFile(path.join(originals, ".ignored.png"), "hidden");
  await writeFile(path.join(thumbnails, "party.svg.webp"), "thumbnail bytes");
  const objects = new Map();
  const operations = [];
  const request = async (method, key, headers, body) => {
    operations.push(method);
    if (method === "PUT") {
      assert.equal(headers["content-md5"], createHash("md5").update(body).digest("base64"));
      objects.set(key, { body, headers });
      return new Response(null, { headers: { etag: `"${createHash("md5").update(body).digest("hex")}"` } });
    }
    const object = objects.get(key);
    if (!object) return new Response(null, { status: 404 });
    return new Response(method === "HEAD" ? null : object.body, {
      headers: { ...object.headers, "content-length": String(object.body.length) },
    });
  };
  try {
    assert.equal((await inventoryMedia(root)).length, 2);
    const first = await syncMedia({ root, request, log() {} });
    assert.equal(first.files, 2);
    assert.equal(first.uploaded, 2);
    assert.equal(first.verifiedDownloads, 2);
    assert.equal(first.bytes, Buffer.byteLength("original bytesthumbnail bytes"));
    operations.length = 0;
    const second = await syncMedia({ root, request, log() {} });
    assert.equal(second.uploaded, 0);
    assert.equal(second.reused, 2);
    assert.equal(first.manifestSha256, second.manifestSha256);
    assert.deepEqual(operations.sort(), ["HEAD", "HEAD"]);
    await writeFile(path.join(originals, "party.svg"), "updated original");
    const changed = await syncMedia({ root, request, log() {} });
    assert.equal(changed.uploaded, 1);
    assert.equal(changed.reused, 1);
    assert.equal(await readFile(path.join(originals, "party.svg"), "utf8"), "updated original");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("corrupted downloads fail verification and invalid configuration cannot receive credentials", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ppdb-r2-bad-"));
  await mkdir(path.join(root, "public/media/logo-thumbnails"), { recursive: true });
  await writeFile(path.join(root, "public/media/logo-thumbnails/test.png.webp"), "expected");
  try {
    await assert.rejects(syncMedia({ root, log() {}, request: async (method) => {
      if (method === "HEAD") return new Response(null, { status: 404 });
      if (method === "PUT") return new Response(null);
      return new Response("corrupted");
    } }), /checksum differs/);
    assert.throws(() => r2Configuration({}), /Missing repository secrets/);
    const config = { R2_ACCOUNT_ID: "a".repeat(32), R2_BUCKET: "ppdb-media", R2_ACCESS_KEY_ID: "test", R2_SECRET_ACCESS_KEY: "test" };
    assert.equal(r2Configuration(config).endpoint, `https://${"a".repeat(32)}.r2.cloudflarestorage.com`);
    assert.throws(() => r2Configuration({ ...config, R2_ENDPOINT: "https://untrusted.example" }), /this account's HTTPS/);
    assert.throws(() => r2Configuration({ ...config, R2_BUCKET: "../other" }), /bucket name/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
