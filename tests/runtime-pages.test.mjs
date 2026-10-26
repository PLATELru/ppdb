import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import XLSX from "xlsx";

test("runtime requests serve the last 50 workbook records with no party HTML files", async () => {
  const files = await readdir(new URL("../dist/client", import.meta.url), { recursive: true });
  assert.equal(files.some((file) => /^party[/\\].*\.html$/.test(file)), false);
  const { default: worker } = await import("../dist/server/index.js");
  const database = JSON.parse(await readFile(new URL("../data/parties.json", import.meta.url), "utf8"));
  const workbook = XLSX.readFile(new URL("../data/PPDB database.xlsx", import.meta.url));
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
  const idColumn = rows[1].indexOf("ID");
  const ids = rows.slice(2).map((row) => row[idColumn]).filter(Boolean).slice(-50);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const ctx = { waitUntil() {}, passThroughOnException() {} };
  for (const id of ids) {
    const response = await worker.fetch(new Request(`http://localhost/party/${id}`), env, ctx);
    assert.equal(response.status, 200, id);
    const html = await response.text();
    assert.ok(html.includes(`<code>${id}</code>`), id);
    const party = database.parties.find((party) => party.id === id);
    assert.ok(html.includes(`Party record / <!-- -->${party.id}`), id);
  }
  const missing = await worker.fetch(new Request("http://localhost/party/ppdb-nonexistent-test-record"), env, ctx);
  assert.equal(missing.status, 404);
  const original = await worker.fetch(new Request("http://localhost/media/logos2/seFF.png"), env, ctx);
  assert.equal(original.status, 302);
  assert.equal(original.headers.get("location"), "https://platelru.github.io/ppdb/media/logos2/seFF.png");
  assert.equal(files.some((file) => /^media[/\\]logos2[/\\]seFF\.png$/.test(file)), false);
  assert.ok(files.includes("media/logo-thumbnails/logos2/seFF.png.webp"));
});
