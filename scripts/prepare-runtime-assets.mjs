import { readdir, rm } from "node:fs/promises";
import path from "node:path";

// Source images and the GitHub Pages export remain intact. Only the Worker
// build output omits originals, which worker/index.ts serves via the Pages host.
const media = path.resolve("dist/client/media");
for (const entry of await readdir(media, { withFileTypes: true })) {
  if (entry.name === "logo-thumbnails") continue;
  await rm(path.join(media, entry.name), { recursive: true, force: true });
}
console.log("Runtime assets retain thumbnails; original media stays on GitHub Pages.");
