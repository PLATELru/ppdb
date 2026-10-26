import { AwsClient } from "aws4fetch";

export function r2Configuration(env = process.env) {
  const required = ["R2_ACCOUNT_ID", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"];
  const missing = required.filter(name => !env[name]?.trim());
  if (missing.length) throw new Error(`Missing repository secrets: ${missing.join(", ")}.`);
  const account = env.R2_ACCOUNT_ID.trim();
  if (!/^[a-f0-9]{32}$/i.test(account)) throw new Error("R2_ACCOUNT_ID must be the 32-character Cloudflare Account ID.");
  const bucket = env.R2_BUCKET.trim();
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)) throw new Error("R2_BUCKET is not a valid bucket name.");
  const endpoint = new URL(env.R2_ENDPOINT?.trim() || `https://${account}.r2.cloudflarestorage.com`);
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.port || endpoint.search || endpoint.hash
    || !new RegExp(`^${account}(?:\\.(?:eu|us|fedramp))?\\.r2\\.cloudflarestorage\\.com$`, "i").test(endpoint.hostname)
    || endpoint.pathname !== "/") throw new Error("R2_ENDPOINT must be this account's HTTPS R2 S3 endpoint.");
  return { endpoint: endpoint.origin, bucket, accessKeyId: env.R2_ACCESS_KEY_ID.trim(), secretAccessKey: env.R2_SECRET_ACCESS_KEY.trim() };
}

export function createR2Client(config) {
  const signer = new AwsClient({ accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey, service: "s3", region: "auto", retries: 0 });
  return async (method, key, headers = {}, body, query) => {
    if (key.split("/").some(segment => segment === "." || segment === "..")) throw new Error("Invalid R2 object key.");
    const url = new URL(`${config.endpoint}/${[config.bucket, ...key.split("/").filter(Boolean)].map(encodeURIComponent).join("/")}`);
    if (query) for (const [name, value] of Object.entries(query)) if (value !== undefined) url.searchParams.set(name, value);
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const signed = await signer.sign(url.href, { method, headers, ...(body === undefined ? {} : { body }) });
        const response = await fetch(signed, { signal: AbortSignal.timeout(60_000), redirect: "error" });
        if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 3) return response;
        await response.body?.cancel();
      } catch {
        if (attempt === 3) throw new Error(`R2 ${method} failed for ${key || "object listing"}; request details are omitted to protect credentials.`);
      }
      await new Promise(resolve => setTimeout(resolve, 250 * 2 ** attempt));
    }
  };
}

export async function requireR2Status(response, method, key) {
  if (response.ok) return;
  await response.body?.cancel();
  throw new Error(`R2 ${method} returned HTTP ${response.status} for ${key}. Check the bucket, endpoint and token permissions.`);
}
