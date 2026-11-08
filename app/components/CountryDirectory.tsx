"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { BiggestParty, CountryDirectoryEntry } from "../../lib/country-directory";
import { sortCountries, type CountrySortDirection, type CountrySortKey } from "../../lib/country-sort";
import { formatDate } from "../../lib/party-dates";

const columns: { key: CountrySortKey; label: string; description?: string; numeric?: boolean }[] = [
  { key: "name", label: "Country" },
  { key: "coverage", label: "Party coverage" },
  { key: "partyCount", label: "Parties", numeric: true },
  { key: "lastRevision", label: "Last revision" },
  { key: "seats", label: "Biggest party", description: "biggest party seats" },
];

function partySeatLabel(party: BiggestParty) {
  if (!party.houses) {
    return `${party.name}: ${party.seats}${party.total ? ` of ${party.total}` : ""} seats, ${party.chamber}`;
  }
  const houseLabel = (house: NonNullable<BiggestParty["houses"]>["lower"]) => (
    house.seats == null ? "not recorded" : `${house.seats}${house.total ? ` of ${house.total}` : ""} seats`
  );
  return `${party.name}: lower house (${party.houses.lower.name}), ${houseLabel(party.houses.lower)}; upper house (${party.houses.upper.name}), ${houseLabel(party.houses.upper)}`;
}

export function CountryDirectory({ countries }: { countries: CountryDirectoryEntry[] }) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const [sort, setSort] = useState<{ key: CountrySortKey; direction: CountrySortDirection }>({
    key: "name", direction: "asc",
  });
  const sorted = useMemo(() => sortCountries(countries, sort.key, sort.direction), [countries, sort]);
  const coveredCount = countries.filter((country) => country.coverage).length;

  function changeSort(key: CountrySortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key ? (current.direction === "asc" ? "desc" : "asc")
        : key === "name" ? "asc" : "desc",
    }));
  }

  return (
    <>
      <div className="countries-table-scroll" role="region" aria-label="Country coverage table" tabIndex={0}>
        <table className="countries-table" aria-describedby="biggest-party-note">
          <caption className="sr-only">Countries, party coverage, number of records, last revision and biggest parliamentary party. Select a column header to sort.</caption>
          <thead>
            <tr>
              {columns.map(({ key, label, description, numeric }) => (
                <th key={key} scope="col" className={numeric ? "country-count" : undefined}
                  aria-sort={sort.key === key ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}>
                  <button className="country-sort-button" onClick={() => changeSort(key)}
                    title={`Sort by ${description ?? label.toLowerCase()}`}>
                    {label}
                    <span className="country-sort-arrow" aria-hidden="true">
                      {sort.key === key ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((country) => {
              const enabled = Boolean(country.coverage);
              const coverageKey = country.coverage?.toLowerCase();
              const coverageClass = coverageKey === "almost all" || coverageKey === "almost all entities"
                ? "coverage-high"
                : coverageKey === "only a few" ? "coverage-low" : "coverage-other";
              return (
                <tr key={country.name} className={enabled ? undefined : "country-uncovered"}>
                  <th scope="row">
                    <div className="country-name-cell">
                      {enabled ? (
                        <a className="country-name" href={`https://platelru.github.io/ppdb/?country=${encodeURIComponent(country.name)}`}>
                          {country.name}
                        </a>
                      ) : <span className="country-name">{country.name}</span>}
                      {country.type && <small className="country-status">{country.type}</small>}
                    </div>
                  </th>
                  <td>
                    <span className={`coverage-badge ${enabled ? coverageClass : "coverage-empty"}`}>
                      {country.coverage ?? "Not specified"}
                    </span>
                  </td>
                  <td className="country-count">{country.partyCount}</td>
                  <td className="country-revision">
                    {country.lastRevision
                      ? <time dateTime={country.lastRevision}>{formatDate(country.lastRevision)}</time>
                      : <span aria-label="No revision date">—</span>}
                  </td>
                  <td>
                    <div className="country-party-list">
                      {country.biggestParties.length ? country.biggestParties.map((party) => {
                        const title = partySeatLabel(party);
                        const badge = <>{party.acronym ?? party.name}<span className="country-party-seats">
                          {party.houses
                            ? `${party.houses.lower.seats ?? "—"} / ${party.houses.upper.seats ?? "—"}`
                            : party.seats}
                        </span></>;
                        return enabled ? (
                          <a key={party.id} className="country-party-badge" href={`${basePath}/party/${party.id}/`}
                            style={{ "--party-color": party.color } as CSSProperties} title={title} aria-label={title}>
                            {badge}
                          </a>
                        ) : (
                          <span key={party.id} className="country-party-badge" title={title}
                            style={{ "--party-color": party.color } as CSSProperties}>{badge}</span>
                        );
                      }) : <span aria-label="No national parliamentary seats recorded">—</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="countries-coverage-summary"><strong>{coveredCount}</strong> / {countries.length} countries covered</p>
    </>
  );
}
