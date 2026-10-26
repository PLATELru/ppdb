// Standalone public image gateway. Bind the private R2 bucket as MEDIA.
// No API keys are needed here; only GET, HEAD and CORS OPTIONS are exposed.
const contentTypes = {
  png: "image/png", svg: "image/svg+xml", jpg: "image/jpeg", jpeg: "image/jpeg",
  webp: "image/webp", gif: "image/gif", avif: "image/avif", tif: "image/tiff", tiff: "image/tiff",
};

export function mediaKey(pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  if (!decoded.startsWith("/media/") || /[\\\u0000-\u001f\u007f]/.test(decoded)) return null;
  const parts = decoded.slice(1).split("/");
  if (parts.some((part) => !part || part.startsWith("."))) return null;
  if (!contentTypes[parts.at(-1).split(".").at(-1).toLowerCase()]) return null;
  return parts.join("/");
}

function conditionalResponse(request, response) {
  const etag = response.headers.get("etag");
  const condition = request.headers.get("if-none-match");
  if (condition && etag && condition.split(",").map((value) => value.trim().replace(/^W\//, "")).some((value) => value === "*" || value === etag)) {
    return new Response(null, { status: 304, headers: response.headers });
  }
  if (request.method === "HEAD") return new Response(null, { status: response.status, headers: response.headers });
  return response;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD, OPTIONS", "Cache-Control": "no-store" } });
    }
    const key = mediaKey(url.pathname);
    if (!key) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: {
      "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS", "Access-Control-Max-Age": "86400",
    } });
    if (!env.MEDIA) return new Response("Media storage is not configured", { status: 503, headers: { "Cache-Control": "no-store" } });
    try {
      // Cache API is effective when this Worker has a custom domain/route.
      // workers.dev still serves R2 directly and allows normal browser caching.
      const cache = globalThis.caches?.default;
      const cacheKey = new Request(url.toString());
      if (request.method === "GET" && cache) {
        const cached = await cache.match(cacheKey);
        if (cached) return conditionalResponse(request, cached);
      }
      const object = request.method === "HEAD" ? await env.MEDIA.head(key) : await env.MEDIA.get(key);
      if (!object) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("Content-Type", contentTypes[key.split(".").at(-1).toLowerCase()]);
      headers.set("Content-Length", String(object.size));
      headers.set("ETag", object.httpEtag);
      headers.set("Cache-Control", "public, max-age=3600");
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("Content-Security-Policy", "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox");
      const response = new Response(request.method === "HEAD" ? null : object.body, { headers });
      if (request.method === "GET" && cache) ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return conditionalResponse(request, response);
    } catch {
      return new Response("Media storage is temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  },
};
