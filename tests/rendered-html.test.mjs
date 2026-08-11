import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

async function fetchHtml(path = "/") {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 200);
  return response.text();
}

test("renders development preview metadata", async () => {
  assert.match(await fetchHtml(), developmentPreviewMeta);
});

test("renders the type filter, oldest sort and dissolved lifespan", async () => {
  const html = await fetchHtml();
  assert.match(html, />Type</);
  assert.match(html, /Oldest first/);
  assert.match(html, /2022 – 2026/);
});

test("renders commented labels and optional prose without hash markers", async () => {
  const jpHtml = await fetchHtml("/party/peJP");
  assert.match(jpHtml, /Castillismo \(factions, since 2025\)/);
  assert.doesNotMatch(jpHtml, /Castillismo\s*#/);

  const bdpHtml = await fetchHtml("/party/peBDP");
  assert.match(bdpHtml, />Relations</);
  assert.match(bdpHtml, /Centre-left to left-wing bloc\./);
});
