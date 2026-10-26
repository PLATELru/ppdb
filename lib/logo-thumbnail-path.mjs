export const thumbnailExtensions = new Set([
  ".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif", ".avif", ".tif", ".tiff",
]);

// Retain the relative directory to avoid collisions between equal filenames.
export function indexThumbnailPath(src) {
  const pathname = src.split(/[?#]/, 1)[0];
  if (!pathname.startsWith("/media/") || pathname.startsWith("/media/logo-thumbnails/")) return null;
  const relative = pathname.slice("/media/".length);
  if (relative.split("/").some((segment) => segment === "." || segment === "..")) return null;
  const extension = /\.[^./]+$/.exec(relative)?.[0].toLowerCase();
  return thumbnailExtensions.has(extension) ? `/media/logo-thumbnails/${relative}.webp` : null;
}
