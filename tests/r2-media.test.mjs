import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import sharp from "sharp";
import { listR2Objects, parseObjectListing, processR2Media, verifyMigrationInventory } from "../scripts/process-r2-media.mjs";
import { thumbnailSettingsVersion } from "../lib/logo-thumbnail.mjs";
import { r2Configuration } from "../lib/r2-client.mjs";

const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const svg = color => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><circle cx="200" cy="150" r="90" fill="${color}"/></svg>`);

function archive() {
  const objects = new Map();
  const operations = [];
  const set = (key, body, headers = {}) => {
    const bytes = Buffer.from(body);
    objects.set(key, { bytes, headers, etag: createHash("md5").update(bytes).digest("hex") });
  };
  const request = async (method, key, headers = {}, body, query) => {
    operations.push({ method, key, query });
    if (query) {
      const files = [...objects].filter(([name]) => name.startsWith(query.prefix)).sort(([a], [b]) => a.localeCompare(b));
      const index = query["continuation-token"] ? Number(query["continuation-token"].split("&")[1]) : 0;
      const selected = files.slice(index, index + 1);
      const more = index + 1 < files.length;
      return new Response(`<ListBucketResult><EncodingType>url</EncodingType><IsTruncated>${more}</IsTruncated>${more ? `<NextContinuationToken>next&amp;${index + 1}</NextContinuationToken>` : ""}${selected.map(([name, item]) => `<Contents><Key>${encodeURIComponent(name)}</Key><ETag>&quot;${item.etag}&quot;</ETag><Size>${item.bytes.length}</Size></Contents>`).join("")}</ListBucketResult>`);
    }
    if (method === "PUT") {
      assert.ok(key.startsWith("media/logo-thumbnails/") || key.startsWith("_ppdb/"), `An original must never be written: ${key}`);
      assert.equal(headers["content-md5"], createHash("md5").update(body).digest("base64"));
      set(key, body, headers);
      return new Response(null, { headers: { etag: `"${objects.get(key).etag}"` } });
    }
    assert.equal(method, "GET", "Processing must not delete R2 objects.");
    const item = objects.get(key);
    // A compressed SVG response may have a weak HTTP ETag while LIST uses the strong storage ETag.
    return item ? new Response(item.bytes, { headers: { ...item.headers, etag: `${key.endsWith(".svg") ? "W/" : ""}"${item.etag}"`, "content-length": String(item.bytes.length) } }) : new Response(null, { status: 404 });
  };
  return { objects, operations, set, request };
}

test("R2 processing handles paginated filenames, changes only affected previews and preserves originals", async () => {
  const r2 = archive();
  const a = "media/logos/a.svg", b = "media/logos/b&b.svg";
  r2.set(a, svg("red")); r2.set(b, svg("blue"));
  const before = Buffer.from(r2.objects.get(a).bytes);
  const first = await processR2Media({ request: r2.request, log() {} });
  assert.equal(first.generated, 2);
  assert.equal((await listR2Objects(r2.request, "media/logos/")).size, 2);
  const preview = "media/logo-thumbnails/logos/a.svg.webp";
  const metadata = await sharp(r2.objects.get(preview).bytes).metadata();
  assert.equal(metadata.width, 192); assert.equal(metadata.height, 96); assert.equal(metadata.hasAlpha, true);
  assert.deepEqual(r2.objects.get(a).bytes, before);
  r2.operations.length = 0;
  const unchanged = await processR2Media({ request: r2.request, log() {} });
  assert.equal(unchanged.generated, 0); assert.equal(unchanged.reused, 2);
  assert.equal(r2.operations.some(x => x.method === "PUT"), false);
  assert.equal(r2.operations.some(x => x.key.startsWith("media/") && !x.query), false);
  r2.set(a, svg("green")); r2.operations.length = 0;
  const changed = await processR2Media({ request: r2.request, log() {} });
  assert.equal(changed.generated, 1); assert.equal(changed.reused, 1);
  assert.deepEqual(r2.operations.filter(x => x.method === "PUT" && x.key.startsWith("media/")).map(x => x.key), [preview]);
  r2.objects.delete(preview);
  const repaired = await processR2Media({ request: r2.request, log() {} });
  assert.equal(repaired.generated, 1);
  const verified = await processR2Media({ request: r2.request, log() {}, verifyAll: true });
  assert.equal(verified.verifiedOriginals, 2); assert.equal(verified.verifiedThumbnails, 2);
});

test("migration verifies actual archive bytes before seeding the manifest and rejects corruption", async () => {
  const r2 = archive();
  r2.set("media/logos/a.svg", svg("red"));
  await processR2Media({ request: r2.request, log() {} });
  const files = [...r2.objects].filter(([key]) => key.startsWith("media/")).map(([key, item]) => ({ key, bytes: item.bytes.length, sha256: hash(item.bytes) }));
  const baseline = { version: 1, settingsVersion: thumbnailSettingsVersion, files };
  const migration = await verifyMigrationInventory({ request: r2.request, baseline, log() {} });
  assert.equal(migration.report.files, 2);
  const result = await processR2Media({ request: r2.request, seed: migration.state, log() {} });
  assert.equal(result.generated, 0); assert.equal(result.reused, 1);
  const state = Buffer.from(r2.objects.get("_ppdb/logo-thumbnails.json").bytes);
  r2.objects.get("media/logos/a.svg").bytes = Buffer.from("corrupted");
  await assert.rejects(verifyMigrationInventory({ request: r2.request, baseline, log() {} }), /checksum differs/);
  await assert.rejects(processR2Media({ request: r2.request, verifyAll: true, log() {} }), /archive checksum differs/);
  assert.deepEqual(r2.objects.get("_ppdb/logo-thumbnails.json").bytes, state);
});

test("invalid pagination, invalid image data and missing storage configuration fail explicitly", async () => {
  assert.throws(() => parseObjectListing("<Error>not a listing</Error>"), /invalid object listing/);
  await assert.rejects(listR2Objects(async () => new Response("<ListBucketResult><IsTruncated>true</IsTruncated><NextContinuationToken>same</NextContinuationToken></ListBucketResult>"), "media/logos/"), /did not advance/);
  const r2 = archive(); r2.set("media/logos/a.png", "not an image");
  await assert.rejects(processR2Media({ request: r2.request, log() {} }), /unsupported image format/);
  assert.equal(r2.objects.has("_ppdb/logo-thumbnails.json"), false);
  assert.throws(() => r2Configuration({}), /Missing repository secrets/);
  const config = { R2_ACCOUNT_ID: "a".repeat(32), R2_BUCKET: "ppdb-media", R2_ACCESS_KEY_ID: "test", R2_SECRET_ACCESS_KEY: "test" };
  assert.equal(r2Configuration(config).endpoint, `https://${"a".repeat(32)}.r2.cloudflarestorage.com`);
  assert.throws(() => r2Configuration({ ...config, R2_ENDPOINT: "https://untrusted.example" }), /this account's HTTPS/);
});
