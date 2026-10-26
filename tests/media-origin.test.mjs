import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { externalMediaUrl, logoSources, normalizeMediaOrigin } from "../lib/media-origin.mjs";
import { prepareRuntimeAssets } from "../scripts/prepare-runtime-assets.mjs";

test("external image delivery uses R2 thumbnails and originals while preserving direct URLs", () => {
  const src = "/media/logos3/test.svg";
  assert.deepEqual(logoSources(src, { basePath: "/ppdb", thumbnail: true, origin: "https://media.example" }), [
    "https://media.example/media/logo-thumbnails/logos3/test.svg.webp",
    "https://media.example/media/logos3/test.svg",
  ]);
  assert.equal(logoSources(src, { basePath: "/ppdb", thumbnail: true, origin: "" })[0], "/ppdb/media/logo-thumbnails/logos3/test.svg.webp");
  assert.deepEqual(logoSources("https://other.example/logo.svg", { thumbnail: true, origin: "https://media.example" }), ["https://other.example/logo.svg"]);
  assert.deepEqual(logoSources(null), []);
  assert.equal(externalMediaUrl("/branding/PPDB.png", "https://media.example"), null);
  assert.equal(normalizeMediaOrigin("https://media.example/"), "https://media.example");
  assert.throws(() => normalizeMediaOrigin("https://media.example/ppdb"), /without a path/);
  assert.throws(() => normalizeMediaOrigin("http://media.example"), /HTTPS/);
});

test("external-media packaging removes deployment images while preserving all source bytes and the disabled fallback", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ppdb-r2-output-"));
  try {
    for (const folder of ["public/media/logos", "dist/client/media/logo-thumbnails", "dist/client/media/logos", "out/media/logos"]) {
      await mkdir(path.join(root, folder), { recursive: true });
      await writeFile(path.join(root, folder, "test.png"), "preserved pixels");
    }
    await prepareRuntimeAssets({ root, external: false });
    assert.equal(await readFile(path.join(root, "dist/client/media/logo-thumbnails/test.png"), "utf8"), "preserved pixels");
    await assert.rejects(readFile(path.join(root, "dist/client/media/logos/test.png")), { code: "ENOENT" });
    await prepareRuntimeAssets({ root, githubPages: true, external: false });
    assert.equal(await readFile(path.join(root, "out/media/logos/test.png"), "utf8"), "preserved pixels");
    await prepareRuntimeAssets({ root, external: true });
    await prepareRuntimeAssets({ root, githubPages: true, external: true });
    await assert.rejects(readFile(path.join(root, "dist/client/media/logo-thumbnails/test.png")), { code: "ENOENT" });
    await assert.rejects(readFile(path.join(root, "out/media/logos/test.png")), { code: "ENOENT" });
    assert.equal(await readFile(path.join(root, "public/media/logos/test.png"), "utf8"), "preserved pixels");
  } finally { await rm(root, { recursive: true, force: true }); }
});
