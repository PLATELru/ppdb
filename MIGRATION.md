# Migration plan

## 1. Freeze the data model first

Do not begin by designing individual pages. Decide which fields the database can express,
then let one template render every party. The shared schema lives in
`src/content.config.ts`.

Recommended stable identifiers:

- party: `countrycode-short-name`, for example `md-pas`;
- country: ISO 3166-1 alpha-2 in lowercase where possible;
- source: a short ID unique inside the party record, for example `cec-2024` or `bti-2026`.

Identifiers should never change merely because a party changes its public name.

## 2. Separate facts from presentation

Party facts belong in `src/data/parties/*.json`.
HTML structure belongs in `src/pages/parties/[id].astro`.
Site-wide appearance belongs in `src/styles/global.css`.

Do not create a new `.astro` file for every party.

## 3. Import in batches

Suggested order:

1. country and party identifiers;
2. names, status and dates;
3. leadership and official links;
4. formation history;
5. ideology and political position;
6. sources and editorial review date;
7. logos and historical visual material.

After every batch, run `npm run build`. Schema errors are easier to fix when introduced
in small groups.

## 4. Preserve provenance

Each controversial or changeable field should refer to source IDs. The starter schema
already supports source IDs for ideology, position, leadership, government status and
international affiliations.

For future development, add claim-level citations to dates and formation-history
relationships as well.

## 5. Avoid premature infrastructure

For a read-only database of hundreds or a few thousand parties, static generation is
sufficient. Add a server database, authentication or a CMS only when one of these becomes
necessary:

- browser-based editing by multiple contributors;
- automatic updates from external APIs;
- private drafts and review permissions;
- tens of thousands of records with unacceptable build times;
- user accounts or user-generated content.

Until then, Git history provides a transparent editorial record and GitHub Pages provides
free hosting.
