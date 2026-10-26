import { thumbnailExtensions } from "./logo-thumbnail-path.mjs";

// The two originals had the same filename and different pixels. Keep both.
const legacyAliases = { "logos3/atFPO.png": "atFPO-alt.png" };

export function resolveLogoReference(value, context = "LOGO") {
  const src = String(value ?? "").trim();
  if (!src) return null;
  if (/^(?:https?:)?\/\//i.test(src) || /^(?:data|blob):/i.test(src)) return src;

  const legacy = /^\/?media\/(logos[23]?)\/([^/?#]+)([?#].*)?$/.exec(src);
  if (legacy) {
    const filename = legacyAliases[`${legacy[1]}/${legacy[2]}`] ?? legacy[2];
    return `/media/logos/${filename}${legacy[3] ?? ""}`;
  }
  // Other media subdirectories remain supported by the thumbnail generator.
  if (src.startsWith("/media/") && !src.split(/[?#]/, 1)[0].split("/").some(part => part === "." || part === "..")) return src;

  const filename = src.split(/[?#]/, 1)[0];
  const extension = /\.[^./]+$/.exec(filename)?.[0].toLowerCase();
  if (!filename.startsWith(".") && !/[\/\\\u0000-\u001f]/.test(filename) && thumbnailExtensions.has(extension)) {
    return `/media/logos/${src}`;
  }
  throw new Error(`${context}: expected an image filename such as rsNPS.png or a direct HTTP(S) URL.`);
}
