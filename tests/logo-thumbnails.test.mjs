import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import { indexThumbnailPath } from "../lib/logo-thumbnail-path.mjs";
import { generateLogoThumbnails } from "../scripts/generate-logo-thumbnails.mjs";

test("local media paths cover all directories without touching remote URLs", () => {
  assert.equal(indexThumbnailPath("/media/logos2/example.png?v=2"), "/media/logo-thumbnails/logos2/example.png.webp");
  assert.equal(indexThumbnailPath("/media/logos3/example.svg"), "/media/logo-thumbnails/logos3/example.svg.webp");
  assert.equal(indexThumbnailPath("/media/future/nested/example.JPG"), "/media/logo-thumbnails/future/nested/example.JPG.webp");
  assert.equal(indexThumbnailPath("https://example.com/logo.png"), null);
  assert.equal(indexThumbnailPath("/media/logo-thumbnails/logo.png.webp"), null);
  assert.equal(indexThumbnailPath("/media/../logo.png"), null);
  assert.equal(indexThumbnailPath("/media/readme.txt"), null);
});

test("thumbnails retain transparency, reuse unchanged files, and refresh changed or deleted images", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ppdb-thumbnails-"));
  try {
    const media = path.join(root, "public", "media");
    await mkdir(path.join(media, "logos2"), { recursive: true });
    await mkdir(path.join(media, "logos3", "nested"), { recursive: true });
    const png = path.join(media, "logos2", "same.png");
    const svg = path.join(media, "logos3", "nested", "same.svg");
    const source = await sharp({ create: { width: 600, height: 300, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0.5 } } }).png().toBuffer();
    await writeFile(png, source);
    await writeFile(svg, '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="160"><circle cx="40" cy="80" r="30" fill="blue"/></svg>');
    const first = await generateLogoThumbnails(root);
    assert.equal(first.generated, 2);
    assert.equal(first.failures.length, 0);
    const output = path.join(media, "logo-thumbnails", "logos2", "same.png.webp");
    const metadata = await sharp(output).metadata();
    assert.equal(metadata.width, 192);
    assert.equal(metadata.height, 96);
    assert.equal(metadata.hasAlpha, true);
    assert.deepEqual(await readFile(png), source);
    const before = (await stat(output)).mtimeMs;
    const second = await generateLogoThumbnails(root);
    assert.equal(second.generated, 0);
    assert.equal(second.reused, 2);
    assert.equal((await stat(output)).mtimeMs, before);
    await writeFile(svg, '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="80"><rect width="160" height="80" fill="green"/></svg>');
    const third = await generateLogoThumbnails(root);
    assert.equal(third.generated, 1);
    assert.equal(third.reused, 1);
    await rm(png);
    await generateLogoThumbnails(root);
    await assert.rejects(stat(output), { code: "ENOENT" });
    await writeFile(svg, "invalid image");
    const failed = await generateLogoThumbnails(root);
    assert.equal(failed.failures.length, 1);
    await assert.rejects(stat(path.join(media, "logo-thumbnails", "logos3", "nested", "same.svg.webp")), { code: "ENOENT" });
  } finally { await rm(root, { recursive: true, force: true }); }
});
