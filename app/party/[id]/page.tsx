import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "../../components/SiteHeader";
import { LogoImage } from "../../components/LogoImage";
import { WikiText } from "../../components/WikiText";
import { formatDate, getParty, parties } from "../../../lib/parties";

type PageProps = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return parties.map((party) => ({ id: party.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const party = getParty(id);
  return party
    ? { title: `${party.name} — PPDB`, description: `${party.name}, ${party.country}: PPDB record.` }
    : { title: "Party not found — PPDB" };
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="info-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default async function PartyPage({ params }: PageProps) {
  const { id } = await params;
  const party = getParty(id);
  if (!party) notFound();

  const established = formatDate(party.established);
  const dissolved = formatDate(party.dissolved);
  const lastEdited = formatDate(party.lastEdited);
  const hasSeats = [party.seats.lowerHouse, party.seats.upperHouse, party.seats.mep].some(
    (value) => value != null,
  );

  return (
    <main className="site-shell">
      <SiteHeader />
      <div className="page-body record-page">
        <div className="breadcrumbs">
          <Link href="/">Index</Link> <span>›</span> <span>{party.country}</span> <span>›</span>{" "}
          <strong>{party.acronym ?? party.name}</strong>
        </div>

        <section className="record-heading" style={{ "--party-color": party.color } as React.CSSProperties}>
          <div className="record-logo-wrap">
            <LogoImage
              src={party.logo}
              alt={`${party.name} logo`}
              fallback={party.acronym ?? party.name.slice(0, 2)}
              loading="eager"
            />
          </div>
          <div>
            <span className="eyebrow">Party record / {party.id}</span>
            <div className="record-context">
              <Link href={`/?country=${encodeURIComponent(party.country)}`}>{party.country}</Link>
              {party.status ? (
                <Link href={`/?status=${encodeURIComponent(party.status)}`}>{party.status}</Link>
              ) : null}
            </div>
            <h1>{party.name}</h1>
            {party.nativeName && party.nativeName !== party.name ? <p>{party.nativeName}</p> : null}
            <div className="record-tags">
              {party.labels.map((label) => (
                <Link key={label} href={`/?label=${encodeURIComponent(label)}`}>{label}</Link>
              ))}
            </div>
          </div>
        </section>

        <div className="record-layout">
          <aside className="panel infobox">
            <div className="section-label">Party details</div>
            <dl>
              {party.acronym ? <InfoRow label="Acronym">{party.acronym}</InfoRow> : null}
              {established ? <InfoRow label="Established">{established}</InfoRow> : null}
              {dissolved ? <InfoRow label="Dissolved">{dissolved}</InfoRow> : null}
              {party.formerNames ? <InfoRow label="Former names">{party.formerNames}</InfoRow> : null}
              {party.website ? (
                <InfoRow label="Website">
                  <a href={party.website} target="_blank" rel="noreferrer">
                    Official website ↗
                  </a>
                </InfoRow>
              ) : null}
            </dl>

            {hasSeats ? (
              <div className="seat-table">
                <h2>Representation</h2>
                {party.seats.lowerHouse != null ? (
                  <div>
                    <span>Lower house</span>
                    <strong>
                      {party.seats.lowerHouse}
                      {party.seats.lowerHouseTotal != null ? ` / ${party.seats.lowerHouseTotal}` : ""}
                    </strong>
                  </div>
                ) : null}
                {party.seats.upperHouse != null ? (
                  <div>
                    <span>Upper house</span>
                    <strong>
                      {party.seats.upperHouse}
                      {party.seats.upperHouseTotal != null ? ` / ${party.seats.upperHouseTotal}` : ""}
                    </strong>
                  </div>
                ) : null}
                {party.seats.mep != null ? (
                  <div>
                    <span>MEPs</span>
                    <strong>
                      {party.seats.mep}
                      {party.seats.mepTotal != null ? ` / ${party.seats.mepTotal}` : ""}
                    </strong>
                  </div>
                ) : null}
              </div>
            ) : null}
          </aside>

          <div className="record-main">
            <section className="panel prose-panel">
              <div className="section-label">Overview</div>
              {party.description ? (
                <div className="record-prose"><WikiText text={party.description} /></div>
              ) : (
                <p className="missing-copy">No descriptive text has been added to this record yet.</p>
              )}
            </section>

            {party.formerLogos.length ? (
              <section className="panel archive-panel">
                <div className="section-label">Former logos</div>
                <div className="former-logo-grid">
                  {party.formerLogos.map((item, index) => (
                    <figure key={`${item.url}-${index}`}>
                      <div>
                        <LogoImage
                          src={item.url}
                          alt={`Former ${party.name} logo`}
                          fallback={party.acronym ?? party.name.slice(0, 2)}
                        />
                      </div>
                      <figcaption>{item.until ? `Used until ${formatDate(item.until)}` : "Earlier logo"}</figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="panel sources-panel">
              <div className="section-label">Sources & maintenance</div>
              {party.sources.length ? (
                <ol>
                  {party.sources.map((source) => (
                    <li key={source}>
                      <a href={source} target="_blank" rel="noreferrer">{source}</a>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="missing-copy">No source links have been entered in the spreadsheet.</p>
              )}
              <div className="maintenance-line">
                <span>Record ID: <code>{party.id}</code></span>
                <span>{lastEdited ? `Last edited ${lastEdited}` : "Last-edited date not recorded"}</span>
              </div>
            </section>
          </div>
        </div>
      </div>
      <footer>
        <Link href="/">← Return to index page</Link>
        <span>PPDB — Political Parties Database</span>
      </footer>
    </main>
  );
}
