import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { FooterXLink } from "../components/FooterXLink";
import { SiteHeader } from "../components/SiteHeader";
import { countryDirectory } from "../../lib/countries";
import { formatDate } from "../../lib/party-dates";

export const metadata: Metadata = {
  title: "Countries — PPDB",
  description: "Country coverage, party counts and revision dates in the Political Parties Database.",
};

const disclaimer = "No country can be covered completely, but PPDB attempts to cover as many parties as possible that have at least minimal relevance and mentions in sources. Also, many countries may become outdated as everything is updated manually";

export default function CountriesPage() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const coveredCount = countryDirectory.filter((country) => country.coverage).length;

  return (
    <main className="site-shell">
      <SiteHeader />
      <div className="page-body countries-page">
        <div className="breadcrumbs">
          <a href={`${basePath}/`}>Index</a> <span>›</span> <strong>Countries</strong>
        </div>

        <aside className="countries-disclaimer" aria-label="Coverage disclaimer">
          <p>{disclaimer}</p>
        </aside>

        <section className="panel countries-panel" aria-labelledby="countries-heading">
          <div className="countries-heading">
            <div>
              <span className="eyebrow">PPDB / Coverage</span>
              <h1 id="countries-heading">Countries</h1>
            </div>
            <span className="countries-total">{countryDirectory.length} countries</span>
          </div>
          <p className="countries-description" id="countries-description">
            {coveredCount} countries have coverage notes. Party counts include all records in the
            country’s Index, including historical parties and coalitions. Countries without a
            coverage status are shown in grey and have no links.
          </p>
          <div className="countries-table-scroll" role="region" aria-label="Country coverage table" tabIndex={0}>
            <table className="countries-table" aria-describedby="countries-description biggest-party-note">
              <caption className="sr-only">Countries, party coverage, number of records, last revision and biggest parliamentary party</caption>
              <thead>
                <tr>
                  <th scope="col">Country</th>
                  <th scope="col">Party coverage</th>
                  <th scope="col" className="country-count">Parties</th>
                  <th scope="col">Last revision</th>
                  <th scope="col">Biggest party</th>
                </tr>
              </thead>
              <tbody>
                {countryDirectory.map((country) => {
                  const enabled = Boolean(country.coverage);
                  const coverageKey = country.coverage?.toLowerCase();
                  const coverageClass = coverageKey === "almost all" || coverageKey === "almost all entities"
                    ? "coverage-high"
                    : coverageKey === "only a few" ? "coverage-low" : "coverage-other";
                  return (
                    <tr key={country.name} className={enabled ? undefined : "country-uncovered"}>
                      <th scope="row">
                        {enabled ? (
                          <a className="country-name" href={`https://platelru.github.io/ppdb/?country=${encodeURIComponent(country.name)}`}>
                            {country.name}
                          </a>
                        ) : <span className="country-name">{country.name}</span>}
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
                            const title = `${party.name}: ${party.seats}${party.total ? ` / ${party.total}` : ""} seats, ${party.chamber}`;
                            const badge = <>{party.acronym ?? party.name}<span className="country-party-seats">{party.seats}</span></>;
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
          <p className="countries-description countries-footnote" id="biggest-party-note">
            Biggest party is based on the national parliamentary seats recorded in PPDB, with
            priority given to the lower or sole chamber, then the upper chamber. Ties show all
            leading parties. Coalitions, dissolved parties and European Parliament seats are
            excluded. A dash means no eligible seat data is recorded.
          </p>
        </section>
      </div>
      <footer>
        <a href={`${basePath}/`}>← Return to index page</a>
        <span>PPDB — Countries</span>
        <FooterXLink />
      </footer>
    </main>
  );
}
