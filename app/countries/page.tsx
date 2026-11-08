import type { Metadata } from "next";
import { CountryDirectory } from "../components/CountryDirectory";
import { FooterXLink } from "../components/FooterXLink";
import { SiteHeader } from "../components/SiteHeader";
import { countryDirectory } from "../../lib/countries";

export const metadata: Metadata = {
  title: "Countries — PPDB",
  description: "Country coverage, party counts and revision dates in the Political Parties Database.",
};

const disclaimer = "No country can be covered completely, but PPDB attempts to cover as many parties as possible that have at least minimal relevance and mentions in sources. Also, many countries may become outdated as everything is updated manually";

export default function CountriesPage() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

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
          <CountryDirectory countries={countryDirectory} />
          <p className="countries-description countries-footnote" id="biggest-party-note">
            Biggest party is based on the national parliamentary seats recorded in PPDB, with
            priority given to the lower or sole chamber, then the upper chamber. In bicameral
            parliaments, seats are shown as lower house / upper house. Ties show all leading
            parties. Coalitions, dissolved parties and European Parliament seats are excluded.
            A dash means no eligible seat data is recorded.
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
