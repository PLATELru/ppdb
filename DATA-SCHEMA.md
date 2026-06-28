# Data model notes

## Required core fields

`id`, `name`, `country`, `status`, `dates.founded`, `summary`, `lastUpdated`.

## Date precision

A date record contains both `date` and `precision`.

Examples:

```json
{ "date": "2024-03-17", "precision": "day", "sourceIds": ["source-id"] }
{ "date": "2024-03", "precision": "month", "sourceIds": [] }
{ "date": "2024", "precision": "year", "sourceIds": [] }
{ "date": null, "precision": "unknown", "sourceIds": [] }
```

Do not invent the day or month merely to fit an ISO date.

## Ideology

`ideology.labels` should normally contain no more than three principal labels. A fourth
is allowed for exceptional coalitions or hybrid historical movements. The `sourceIds`
array should point to independent secondary sources wherever possible.

`ideology.position` is kept separate because a left–right placement is an analytical
classification, not simply another ideology.

## Status

- `active`: demonstrably operating at the review date;
- `inactive`: still legally or nominally existing, but not observably active;
- `dissolved`: formally terminated or merged out of existence;
- `historical`: historical organisation for which the exact legal dissolution category
  is not useful or known;
- `unknown`: evidence is insufficient.

## Sources

The starter keeps sources embedded in each party file. This is intentionally simple.
If the same bibliography begins to be repeated across many entries, move sources into a
separate collection and refer to global source IDs.

## Countries

A country is introduced by the first party record that uses it. For Moldova, use:

```json
"country": { "id": "md", "name": "Moldova" }
```

The country directory and `/countries/md/` page are generated automatically. Keep the same country ID and spelling in every Moldovan party record.

## Claim-level citations

Dates, formation history, ideology, leadership, government status and international affiliations can carry `sourceIds`. Each ID must correspond to an object in the record's `sources` array.
