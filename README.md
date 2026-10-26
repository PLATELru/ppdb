# Political Parties Database (PPDB)

In short,
PPDB is a database of political parties from around the world.

The site was built almost entirely with the help of ChatGPT, yet the hundreds upon hundreds of entries were added manually by a single person.

This site may contain unverified and controversial information, as the topic it describes cannot be completely unambiguous.

If you have any suggestions, complaints, or corrections, please send me a dm at https://x.com/partiesdatabase .

## Local use

```bash
npm install
npm run import:data
npm run dev
```

The import stops on duplicate IDs or rows missing a required field. Run `npm run lint` for source checks and `npm run build:github` to reproduce the GitHub Pages export in `out/`.

Upload the current workbook as `PPDB database.xlsx` in the repository root. The importer uses this file when present and falls back to `data/PPDB database.xlsx`. In `LABELS` and `TYPE`, write `canonical name | display name` to keep filters and grouping under the canonical name. `LABELS` also accepts a comment after `#`, including on a line with a display name.

## Runtime hosting and fallback

`npm run build` produces the Cloudflare Worker in `dist/server/index.js` and its
static assets in `dist/client`. The shared `/party/:id` template renders the
requested record on the server, including its title and metadata. No HTML file
is built for each party. Direct links, reloads, and real 404 responses for missing
records work without a client-side 404 workaround.

`npm run build:github` remains available as a separate GitHub Pages fallback. It
uses `/ppdb`, prerenders party pages, and writes `out/`. The existing Pages workflow
is retained. Publishing the Worker does not redirect or remove the Pages site.
Runtime publication through Sites is separate from the GitHub Pages workflow;
GitHub pushes do not currently trigger a Sites deployment automatically.

The runtime archive keeps generated thumbnails locally. Original `/media/*`
image requests are redirected to the retained GitHub Pages image archive at
`https://platelru.github.io/ppdb/media/`. This keeps the runtime upload below the
hosting archive limit without modifying or deleting original files. Keep the
Pages publication available for full-resolution images and the fallback site.

Before the migration, the complete GitHub source was retained on
`backup/before-runtime-pages-2026-10-26` at commit
`1dee3c2cff6dafa258e7b0043b9655de2c23adad`. The previous hosted Site version is
also retained in its version history. For an immediate fallback, use the existing
GitHub Pages site. Revert the migration commit to roll back its code changes;
avoid resetting the whole branch, which would discard subsequent workbook edits.

## Logo thumbnails

The thumbnail generator scans all subdirectories of `public/media`, excluding
its own `logo-thumbnails` output. PNG, JPEG, SVG, WebP, GIF, AVIF, and TIFF files
receive WebP previews up to 192 × 192; animated files use their first frame.
Original image bytes are preserved. Directory names remain in the preview paths,
so equal filenames in different folders stay separate.

A content manifest reuses unchanged previews and removes obsolete ones. The
GitHub Pages workflow caches the previews between runs. An image that cannot be
converted still falls back to its original when viewed in the directory.

## External R2 media archive

The `Sync PPDB media to R2` GitHub Actions workflow copies original images and
generated thumbnails from every `public/media` subdirectory to the account's
private R2 bucket. Configure repository Actions secrets `R2_ACCOUNT_ID`,
`R2_BUCKET`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY`. Use an R2 S3 token
with Object Read & Write restricted to this bucket. For a jurisdiction-specific
bucket, also set `R2_ENDPOINT` to the endpoint shown by Cloudflare.

Keys retain the existing `media/...` paths. Source files are never changed or
deleted, and the synchronizer never deletes remote objects. Each uploaded
image is downloaded again and compared by SHA-256. Existing objects with the
same content hash, size, and content type are reused. The workflow records a
file inventory and verification summary in its `r2-media-verification` artifact;
credentials and signed requests are not logged or included in that artifact.

Synchronization runs on relevant media or generator changes on `main` and can
also be started manually. Copying the archive does not change public image
delivery: the existing Pages archive remains the fallback until a separate
read-only media endpoint has been connected and verified. The source before
R2 setup is retained on `backup/before-r2-media-2026-10-26`.
