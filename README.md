# Political Parties Database (PPDB)

PPDB is a compact, spreadsheet-driven reference site. The workbook is the source of truth: one party row becomes one catalogue card and one permanent party page.

## Add or edit a party

1. Open `data/PPDB database.xlsx`.
2. Keep rows 1–2 unchanged. Row 1 describes the value type; row 2 contains the machine-readable field names.
3. Add or edit one party per row. `COUNTRY`, `ID` and `NAME` are required; every other field may be left empty.
4. Commit the workbook. The GitHub Pages workflow validates it, converts it to `data/parties.json` and deploys the updated site.

The ID is the stable key used in URLs and internal links. For example, `atOVP` becomes `/party/atOVP/`. Inside `DESCRIPTION`, write `[[atOVP|Austrian People's Party]]` to link to that record. Missing target IDs are rendered as ordinary text rather than broken links.

Use real spreadsheet dates in date columns. In `SOURCES`, put one URL on each line.

## Local use

```bash
npm install
npm run import:data
npm run dev
```

The import stops on duplicate IDs or rows missing a required field. Run `npm run lint` for source checks and `npm run build:github` to reproduce the GitHub Pages export in `out/`.
