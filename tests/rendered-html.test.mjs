import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

test("renders the type filter, oldest sort and lifespan for any record with dissolution", async () => {
  const html = await fetchHtml();
  assert.match(html, />Type</);
  assert.match(html, /Oldest first/);
  assert.match(html, /2022 – 2026/);
  assert.match(html, /1990 – 1993/);
});

test("renders optional registration and delegalisation dates only on party pages", async () => {
  const indexHtml = await fetchHtml();
  assert.doesNotMatch(indexHtml, />Registered</);
  assert.doesNotMatch(indexHtml, />Delegalised</);

  const registeredHtml = await fetchHtml("/party/kzAdilet");
  assert.match(registeredHtml, />Registered</);
  assert.match(registeredHtml, /6 January 2026/);

  const delegalisedHtml = await fetchHtml("/party/ruKPRSFSR");
  assert.match(delegalisedHtml, />Delegalised</);
  assert.match(delegalisedHtml, /6 November 1991/);
});

test("renders commented labels and optional prose without hash markers", async () => {
  const jpHtml = await fetchHtml("/party/peJP");
  assert.match(jpHtml, /Castillismo \(factions, since 2025\)/);
  assert.doesNotMatch(jpHtml, /Castillismo\s*#/);

  const bdpHtml = await fetchHtml("/party/peBDP");
  assert.match(bdpHtml, />Relations</);
  assert.match(bdpHtml, /Centre-left to left-wing bloc\./);
});

test("sizes each visible logo frame to the source aspect ratio without a cropped duplicate", async () => {
  const [component, styles] = await Promise.all([
    readFile(new URL("../app/components/LogoImage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(component, /--logo-aspect/);
  assert.match(component, /logo-frame-\$\{frame\?\.orientation/);
  assert.doesNotMatch(component, /logo-edge-fill/);
  assert.match(styles, /\.logo-frame-landscape[\s\S]*?width: calc\(100% - 2px\)/);
  assert.match(styles, /\.logo-frame-portrait[\s\S]*?height: calc\(100% - 2px\)/);
  assert.match(styles, /\.logo-image-stack > img[\s\S]*?object-fit: contain;/);
  assert.doesNotMatch(styles, /object-fit: cover/);
});

test("renders the index in batches of 100 and observes the scroll sentinel", async () => {
  const component = await readFile(
    new URL("../app/components/PartyDirectory.tsx", import.meta.url),
    "utf8",
  );

  assert.match(component, /const INDEX_PAGE_SIZE = 100/);
  assert.match(component, /visible\.slice\(0, renderLimit\)/);
  assert.match(component, /new IntersectionObserver/);
  assert.match(component, /current\.limit : INDEX_PAGE_SIZE\) \+ INDEX_PAGE_SIZE/);
  assert.match(component, /ref=\{loadMoreRef\}/);
});
