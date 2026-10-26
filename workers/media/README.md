# PPDB image gateway

This standalone Worker exposes only image reads from the private R2 archive.
It accepts `/media/...` paths, including all thumbnail folders. No R2 API key
is stored in its source or required at runtime. The `MEDIA` binding connects
the existing bucket in the same Cloudflare account. Bucket listing, hidden
files, non-image objects and public writes are rejected.

## Cloudflare dashboard

Create a Worker named `ppdb-media` under Workers & Pages. Replace its example
code with the complete contents of `index.mjs` in this directory and deploy.
In the Worker's Bindings tab, add an R2 bucket binding named `MEDIA`, select
the existing `ppdb-media` bucket, and apply/deploy the change.

The final URL will be `https://ppdb-media.<account-subdomain>.workers.dev`.
Test `/media/logos2/seFF.png` and
`/media/logo-thumbnails/logos2/seFF.png.webp` on that origin before switching
the website. The bucket itself can remain private. A custom domain is optional;
Cloudflare's Cache API becomes effective on a custom domain or route, while
workers.dev serves R2 directly with one-hour browser caching.

## Wrangler alternative

From this directory, authenticate to the bucket's Cloudflare account and run:

```sh
npx wrangler@4.92.0 login
npx wrangler@4.92.0 deploy
```

Change `bucket_name` in `wrangler.jsonc` first if the bucket has another name.
Use the Worker's public origin as the website's media origin only after the
remote files and the two sample image paths have passed verification.
