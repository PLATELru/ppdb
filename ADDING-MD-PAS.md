# Adding Moldova and PAS

## 1. Add the party file

Create `src/data/parties/md-pas.json`. The file name, route identifier and JSON `id` are all `md-pas`. This is a permanent technical identifier; it should not change if the public party name changes.

## 2. Introduce the country

No separate country file is required in this version of the project. The object below introduces Moldova:

```json
"country": { "id": "md", "name": "Moldova" }
```

Astro then generates `/countries/md/`, and the country appears in `/countries/`. Every later Moldovan party should use exactly the same country object.

## 3. Distinguish foundation from registration

PAS held its constituent congress on 15 May 2016 and was registered by the Ministry of Justice on 26 May 2016. These are represented as two separate date records and both carry source IDs.

## 4. Classify ideology cautiously

The record uses three labels: social liberalism, pro-Europeanism and anti-corruption. The note on social liberalism makes clear that this is the party's own term, while KU Leuven describes the doctrine as New Liberalism. The left–right position is stored separately as centre-right.

## 5. Record current leadership and government status

Igor Grosu's first election as party president is stored as the start date. His 2026 re-election is placed in a note rather than replacing the original start date. PAS government status begins on 6 August 2021, when the Gavrilița cabinet was sworn in.

## 6. Build and inspect

```bash
npm run build
npm run dev
```

With the configured GitHub Pages base path, inspect:

- `/ppdb/parties/md-pas/`
- `/ppdb/countries/md/`
- `/ppdb/countries/`

The build should fail if the record violates the shared schema.
