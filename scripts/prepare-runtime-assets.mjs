import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { MEDIA_ORIGIN } from "../lib/media-origin.mjs";

// Prune only generated deployment output. Source originals and thumbnails
// remain available for upload, verification and rollback.
export async function prepareRuntimeAssets({ root = process.cwd(), githubPages = false, external = Boolean(MEDIA_ORIGIN) } = {}) {
  const media = path.join(root, githubPages ? "out/media" : "dist/client/media");
  if (external) {
    await rm(media, { recursive: true, force: true });
    console.log("Deployment images are served by the verified external gateway; source media is preserved.");
    return;
  }
  if (githubPages) {
    console.log("External media is disabled; GitHub Pages retains its image archive.");
    return;
  }
  for (const entry of await readdir(media, { withFileTypes: true })) {
    if (entry.name === "logo-thumbnails") continue;
    await rm(path.join(media, entry.name), { recursive: true, force: true });
  }
  console.log("Runtime assets retain thumbnails; original media stays on GitHub Pages.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await prepareRuntimeAssets({ githubPages: process.argv.includes("--github") });
}
