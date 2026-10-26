import { indexThumbnailPath } from "./logo-thumbnail-path.mjs";

// Public read-only gateway origin. Activate only after its remote images have
// been verified. Empty keeps the existing local/Pages delivery and rollback.
export const MEDIA_ORIGIN = "https://ppdb-media.tifmch.workers.dev";

export function normalizeMediaOrigin(origin) {
  if (!origin) return "";
  const url = new URL(origin);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("The media origin must be an HTTPS origin without a path or credentials.");
  }
  return url.origin;
}

export function externalMediaUrl(src, origin = MEDIA_ORIGIN) {
  const normalized = normalizeMediaOrigin(origin);
  return normalized && src.startsWith("/media/") ? `${normalized}${src}` : null;
}

function withBasePath(src, basePath) {
  if (/^(?:[a-z]+:)?\/\//i.test(src) || /^(?:data|blob):/i.test(src)) return src;
  return `${basePath}${src.startsWith("/") ? src : `/${src}`}`;
}

export function logoSources(src, { basePath = "", thumbnail = false, origin = MEDIA_ORIGIN } = {}) {
  if (!src) return [];
  const thumbnailSrc = thumbnail ? indexThumbnailPath(src) : null;
  const originalSrc = externalMediaUrl(src, origin) ?? withBasePath(src, basePath);
  return [...new Set([
    thumbnailSrc ? (externalMediaUrl(thumbnailSrc, origin) ?? withBasePath(thumbnailSrc, basePath)) : null,
    originalSrc,
  ].filter(Boolean))];
}
