# Political Parties Database — Astro skeleton

A static, source-oriented political parties database built with Astro 7.

## What this skeleton already does

- stores each party as one JSON file;
- validates every file against a shared schema;
- generates one page per party automatically;
- generates a searchable and filterable party directory;
- generates country pages;
- exports all entries as `/data/parties.json`;
- handles GitHub Pages deployment under `/ppdb`;
- provides explicit source references and editorial-quality fields;
- uses no client framework and only a small amount of vanilla JavaScript.

## Run locally

Requirements: Node.js 22.12.0 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Astro.

Before every push:

```bash
npm run build
```

The build validates the content schema and produces the static site in `dist/`.

## Deploy to GitHub Pages

1. Push this project to the `PLATELru/ppdb` repository.
2. In GitHub, open **Settings → Pages**.
3. Set **Source** to **GitHub Actions**.
4. Push to `main`.
5. The workflow in `.github/workflows/deploy.yml` will build and deploy the site.

The current configuration assumes:

```js
site: "https://platelru.github.io"
base: "/ppdb"
```

Remove `base` after moving to a custom domain.

## Add a party

1. Copy `src/data/parties/_template.json`.
2. Rename it to a stable identifier, for example `md-pas.json`.
3. Set the same value in the JSON `id` field.
4. Add the party logo under `public/logos/`.
5. Set `"logo": "/logos/md-pas.svg"`.
6. Run `npm run build`.

Files beginning with `_` are ignored by the collection loader.

## Important editorial rule

Keep uncertain information explicit. Use `null`, `"unknown"`, a reduced date precision,
or an editorial note instead of filling gaps by inference.

The two `demo-*` entries are fictional and must be deleted after real data is imported.
