# Political Parties Database (PPDB)

Everything below is AI-written.

## Add or edit a party

1. Open `data/PPDB database.xlsx`.
2. Keep rows 1–2 unchanged. Row 1 describes the value type; row 2 contains the machine-readable field names.
3. Add or edit one party per row. `COUNTRY`, `ID` and `NAME` are required; every other field may be left empty.
4. Commit the workbook. The GitHub Pages workflow validates it, converts it to `data/parties.json` and deploys the updated site.

`data/parties.json` is a generated build artifact, not a second database. Do not edit it when adding or correcting records: every production build recreates it from `PPDB database.xlsx` before the site is compiled.

The ID is the stable key used in URLs and internal links. For example, `atOVP` becomes `/party/atOVP/`. Inside `DESCRIPTION`, write `[[atOVP|Austrian People's Party]]` to link to that record. Missing target IDs are rendered as ordinary text rather than broken links.

Use real spreadsheet dates in date columns. In `SOURCES`, put one URL on each line.

In `LABELS`, put one label on each line. If a line contains `#`, the label is omitted from Index cards and the Label filter; its record-page tag keeps the text after `#` as a comment but omits the hash itself. In `TYPE`, put one or more values on separate lines. A blank `TYPE` is imported as `Party`.

`RELATIONS`, `DESCRIPTION`, `Ideology` and `LEADERSHIP` are optional prose fields. Spreadsheet line breaks, bold text and italics are preserved. Empty optional sections are not rendered.

Country-level chamber sizes live on the `Legislatures` sheet. PPDB combines those totals with each party's `LOWER_HOUSE`, `UPPER_HOUSE` and `MEP` values, so a record can display a share such as `57 / 183` without duplicating the total in every party row.

## Store a logo in the repository

1. Add the image file to `public/media/logos/`.
2. In the party row's `LOGO` cell, enter `/media/logos/<filename>` — for example, `/media/logos/atFPO.png`.
3. Commit both the image and the workbook. The same path works on the Sites deployment and GitHub Pages.

External image URLs remain supported, but repository-hosted files avoid broken links when an external host moves or removes an image.

## Local use

```bash
npm install
npm run import:data
npm run dev
```

The import stops on duplicate IDs or rows missing a required field. Run `npm run lint` for source checks and `npm run build:github` to reproduce the GitHub Pages export in `out/`.
