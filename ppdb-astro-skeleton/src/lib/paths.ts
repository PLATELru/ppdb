export function withBase(path = "/"): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function assetPath(path?: string | null): string {
  if (!path) return withBase("/logo-placeholder.svg");
  if (/^https?:\/\//.test(path)) return path;
  return withBase(path.startsWith("/") ? path : `/${path}`);
}
