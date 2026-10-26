# Political Parties Database (PPDB)

PPDB is a database of political parties from around the world.

The site was built almost entirely with the help of ChatGPT, yet the entries
were added manually by a single person. This site may contain unverified and
controversial information, as the topic it describes cannot be completely
unambiguous. Send suggestions or corrections to https://x.com/partiesdatabase .

## Updating the database and images

Replace `data/PPDB database.xlsx` with the current workbook. An upload named
`PPDB database.xlsx` at the repository root still takes priority when present.
In `LABELS` and `TYPE`, use `canonical name | display name` to retain grouping
under the canonical name. `LABELS` also accepts a comment after `#`.

Original logos are uploaded directly to the private `ppdb-media` Cloudflare R2
bucket under `media/logos/`. Spreadsheet image fields accept a filename such as
`uaSolidarnist.png`, or a direct image URL. Former logos use
`filename|comment|date`, one image per line. Earlier `/media/logos2/` and
`/media/logos3/` references remain supported by the importer.

See [the complete update instructions](docs/image-upload.md).

## R2 media processing

R2 owns the originals and WebP thumbnails. The current Git source and deployment
artifacts do not contain the logo archive. The public read-only gateway at
`https://ppdb-media.tifmch.workers.dev` uses the `MEDIA` binding to the private
`ppdb-media` bucket. It accepts image reads; storage credentials are never sent
to the browser. Its source and configuration are in [workers/media](workers/media/README.md).

`npm run media:process` lists all original and thumbnail objects with pagination.
The private `_ppdb/logo-thumbnails.json` manifest records source versions and
checksums. Only new or changed originals, missing previews, and changed preview
settings require image downloads and conversion. Originals are read without
modification. New previews are downloaded again and verified byte for byte.

The `Update PPDB logo thumbnails` action can be run manually after image-only
uploads. It also offers `verify_all` to download and verify every current image.
The Pages workflow runs normal processing before publishing. Both workflows
share a concurrency group so manifest updates cannot overlap. Reports are saved
in the `r2-media-processing` workflow artifact for 30 days.

Configure Actions secrets `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, and
`R2_SECRET_ACCESS_KEY`, using an R2 Object Read & Write token restricted to this
bucket. A jurisdiction-specific bucket can also set `R2_ENDPOINT`. Credentials
remain in Actions secrets. Local builds need no storage credentials.

The transition verifies SHA-256 and byte counts against an inventory of every
GitHub original and preview before the archive is removed from the current Git
tree. That report is also stored privately in R2 at
`_ppdb/github-removal-verification.json`. Old commits and the pre-migration
backup branches are retained; their historical image contents remain available.
The processor never deletes R2 objects.

## Build and hosting

```bash
npm install
npm run import:data
npm run dev
```

`import:data` generates the database and directory index from the workbook. It
does not fetch or generate images. Duplicate IDs and missing required values
stop the import.

`npm run build` produces the Sites Worker in `dist/server/index.js` and static
assets in `dist/client`. Party pages use one shared server template with real
404 responses. `npm run build:github` separately prerenders the GitHub Pages
fallback under `/ppdb` in `out/`. Both hosts load logos from R2.

GitHub pushes publish GitHub Pages automatically. The main Sites publication is
updated separately from the pushed source; a GitHub push does not automatically
publish that Site. An image replaced under an existing filename is served to
both hosts through R2 without a Site rebuild, subject to the one-hour image
cache. Use a new filename for immediate image changes.

The source before runtime migration is retained on
`backup/before-runtime-pages-2026-10-26` at
`1dee3c2cff6dafa258e7b0043b9655de2c23adad`. R2 setup and image-delivery backup
branches are also retained. Restore image files from R2 or the historical Git
source before attempting a rollback to local image delivery.
