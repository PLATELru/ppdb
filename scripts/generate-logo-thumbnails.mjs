import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const inputRoot = path.join(root, "public", "media", "logos");
const outputRoot = path.join(root, "public", "media", "logo-thumbnails");
const supportedExtensions = new Set([".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return walk(target);
      return supportedExtensions.has(path.extname(entry.name).toLowerCase()) ? [target] : [];
    }),
  );
  return nested.flat();
}

await fs.rm(outputRoot, { force: true, recursive: true });
await fs.mkdir(outputRoot, { recursive: true });

const inputs = await walk(inputRoot);
const failures = [];
let cursor = 0;

async function createNextThumbnail() {
  while (cursor < inputs.length) {
    const input = inputs[cursor];
    cursor += 1;
    const relativePath = path.relative(inputRoot, input);
    const output = path.join(outputRoot, `${relativePath}.webp`);
    try {
      await fs.mkdir(path.dirname(output), { recursive: true });
      await sharp(input, {
        animated: false,
        density: 144,
        failOn: "none",
        limitInputPixels: false,
      })
        .rotate()
        .resize({
          width: 192,
          height: 192,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ alphaQuality: 90, effort: 4, quality: 80, smartSubsample: true })
        .toFile(output);
    } catch (error) {
      failures.push(`${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

const concurrency = Math.max(1, Math.min(6, os.availableParallelism?.() ?? os.cpus().length));
await Promise.all(Array.from({ length: concurrency }, () => createNextThumbnail()));

if (failures.length) {
  console.warn(`Skipped ${failures.length} logo thumbnails:\n${failures.join("\n")}`);
}
console.log(`Generated ${inputs.length - failures.length} index logo thumbnails.`);
