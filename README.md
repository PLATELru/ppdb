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
