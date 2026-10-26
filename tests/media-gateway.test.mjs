import assert from "node:assert/strict";
import test from "node:test";
import gateway, { mediaKey } from "../workers/media/index.mjs";

test("the public gateway serves images and conditional HEAD requests without exposing writes or other bucket keys", async () => {
  const calls = [];
  const object = () => ({
    size: 5, body: new TextEncoder().encode("image"), httpEtag: '"test-etag"',
    writeHttpMetadata(headers) { headers.set("content-type", "text/html"); },
  });
  const env = { MEDIA: {
    async get(key) { calls.push(["get", key]); return key.endsWith("test.svg") ? object() : null; },
    async head(key) { calls.push(["head", key]); return object(); },
  } };
  const request = (pathname, init) => new Request(`https://media.example${pathname}`, init);
  const ctx = { waitUntil() {} };
  const response = await gateway.fetch(request("/media/logos3/test.svg"), env, ctx);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "image");
  assert.equal(response.headers.get("content-type"), "image/svg+xml");
  assert.ok(response.headers.get("content-security-policy").includes("sandbox"));
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  const head = await gateway.fetch(request("/media/logos3/test.svg", { method: "HEAD" }), env, ctx);
  assert.equal(await head.text(), "");
  assert.equal(head.headers.get("content-length"), "5");
  const unchanged = await gateway.fetch(request("/media/logos3/test.svg", { headers: { "If-None-Match": 'W/"test-etag"' } }), env, ctx);
  assert.equal(unchanged.status, 304);
  assert.equal(await unchanged.text(), "");
  const previousCalls = calls.length;
  assert.equal((await gateway.fetch(request("/media/test.svg", { method: "PUT", body: "replace" }), env, ctx)).status, 405);
  assert.equal((await gateway.fetch(request("/credentials.json"), env, ctx)).status, 404);
  assert.equal((await gateway.fetch(request("/media/"), env, ctx)).status, 404);
  assert.equal(calls.length, previousCalls);
  assert.equal((await gateway.fetch(request("/media/missing.svg"), env, ctx)).status, 404);
});

test("media paths reject hidden files, traversal and invalid encodings", () => {
  assert.equal(mediaKey("/media/logo-thumbnails/logos3/test.svg.webp"), "media/logo-thumbnails/logos3/test.svg.webp");
  for (const pathname of ["/media/.manifest.json", "/media/.secret.svg", "/media/../test.svg", "/media/%2e%2e/test.svg", "/media/%00.svg", "/media/%zz.png", "/media//test.svg", "/media/test\\name.png"]) {
    assert.equal(mediaKey(pathname), null, pathname);
  }
});
