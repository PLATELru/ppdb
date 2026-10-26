import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { thumbnailExtensions } from "../lib/logo-thumbnail-path.mjs";

const settingsVersion = `192-webp-80-alpha90-v1-sharp-${sharp.versions.sharp}`;

export async function generateLogoThumbnails(root = process.cwd()) {
  const inputRoot = path.join(root, "public", "media");
  const outputRoot = path.join(inputRoot, "logo-thumbnails");
  const manifestPath = path.join(outputRoot, ".manifest.json");
  let previous = {};
  try { previous = JSON.parse(await fs.readFile(manifestPath, "utf8")); }
  catch (error) {
    if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
  }
  await fs.mkdir(outputRoot, { recursive: true });

  async function walk(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      if (target === outputRoot) return [];
      if (entry.isDirectory()) return walk(target);
      return entry.isFile() && thumbnailExtensions.has(path.extname(entry.name).toLowerCase())
        ? [target] : [];
    }));
    return nested.flat();
  }

  const inputs = await walk(inputRoot);
  const manifest = {};
  const failures = [];
  let cursor = 0;
  let generated = 0;
  let reused = 0;

  async function createNextThumbnail() {
    while (cursor < inputs.length) {
      const input = inputs[cursor++];
      const relativePath = path.relative(inputRoot, input).split(path.sep).join("/");
      const output = path.join(outputRoot, `${relativePath}.webp`);
      const temporary = `${output}.tmp`;
      try {
        const bytes = await fs.readFile(input);
        const fingerprint = createHash("sha256").update(settingsVersion).update(bytes).digest("hex");
        if (previous[relativePath] === fingerprint && await fs.stat(output).then(() => true, () => false)) {
          manifest[relativePath] = fingerprint;
          reused++;
          continue;
        }
        await fs.mkdir(path.dirname(output), { recursive: true });
        await sharp(bytes, { animated: false, density: 144, failOn: "none" })
          .rotate()
          .resize({ width: 192, height: 192, fit: "inside", withoutEnlargement: true })
          .webp({ alphaQuality: 90, effort: 4, quality: 80, smartSubsample: true })
          .toFile(temporary);
        await fs.rename(temporary, output);
        manifest[relativePath] = fingerprint;
        generated++;
      } catch (error) {
        await fs.rm(temporary, { force: true });
        await fs.rm(output, { force: true });
        failures.push(`${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  const concurrency = Math.max(1, Math.min(4, os.availableParallelism?.() ?? os.cpus().length));
  await Promise.all(Array.from({ length: concurrency }, () => createNextThumbnail()));
  for (const relative of Object.keys(previous)) {
    if (!Object.hasOwn(manifest, relative)) {
      await fs.rm(path.join(outputRoot, `${relative}.webp`), { force: true });
    }
  }
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);
  if (failures.length) console.warn(`Skipped ${failures.length} logo thumbnails:\n${failures.join("\n")}`);
  console.log(`Index logo thumbnails: ${generated} generated, ${reused} reused, ${failures.length} skipped.`);
  return { generated, reused, failures };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await generateLogoThumbnails();
}
