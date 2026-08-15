import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "../../components/SiteHeader";
import { LogoImage } from "../../components/LogoImage";
import { RichText, WikiText } from "../../components/WikiText";
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

function SeatRow({
  color,
  label,
  total,
  value,
}: {
  color: string;
  label: string;
  total: number | null;
  value: number | null;
}) {
  if (value == null) return null;
  const share = total != null && total > 0
    ? Math.min(100, Math.max(0, (value / total) * 100))
    : null;

  return (
    <div className="seat-row">
      <span>{label}</span>
      <div className="seat-result">
        <strong>{value}{total != null ? ` / ${total}` : ""}</strong>
        {share != null && total != null ? (
          <span
            className="seat-bar"
            role="progressbar"
            aria-label={`${label}: ${value} of ${total} seats`}
            aria-valuemax={total}
            aria-valuemin={0}
            aria-valuenow={Math.min(total, Math.max(0, value))}
          >
            <span
              className="seat-bar-fill"
              style={{
                "--seat-color": color,
                "--seat-share": `${share}%`,
              } as React.CSSProperties}
            />
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default async function PartyPage({ params }: PageProps) {
  const { id } = await params;
  const party = getParty(id);
  if (!party) notFound();

  const established = formatDate(party.established);
  const registered = formatDate(party.registered);
  const delegalised = formatDate(party.delegalised);
  const dissolved = formatDate(party.dissolved);
  const lastEdited = formatDate(party.lastEdited);
  const hasSeats = [
    party.seats.legislature,
    party.seats.lowerHouse,
    party.seats.upperHouse,
    party.seats.mep,
  ].some((value) => value != null);
  const externalLinks = [
    { label: "Website", href: party.website, text: "Official website" },
    { label: "Archived website", href: party.archivedWebsite, text: "Archived website" },
    { label: "Facebook", href: party.socials.facebook, text: "Facebook" },
    { label: "YouTube", href: party.socials.youtube, text: "YouTube" },
    { label: "X", href: party.socials.x, text: "X" },
    { label: "Instagram", href: party.socials.instagram, text: "Instagram" },
    { label: "TikTok", href: party.socials.tiktok, text: "TikTok" },
    { label: "Telegram", href: party.socials.telegram, text: "Telegram" },
    { label: "VK", href: party.socials.vk, text: "VK" },
  ];

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
              <Link href={`/?country=${encodeURIComponent(party.country)}`}>
                <RichText text={party.country} runs={party.formatting.country} />
              </Link>
              {party.types.map((item, typeIndex) => (
                <Link key={item} href={`/?type=${encodeURIComponent(item)}`}>
                  <RichText text={item} runs={party.formatting.types[typeIndex]} />
                </Link>
              ))}
              {party.status ? (
                <Link href={`/?status=${encodeURIComponent(party.status)}`}>
                  <RichText text={party.status} runs={party.formatting.status} />
                </Link>
              ) : null}
            </div>
            <h1><RichText text={party.name} runs={party.formatting.name} /></h1>
            {party.nativeName && party.nativeName !== party.name ? (
              <p className="native-party-name">
                <RichText text={party.nativeName} runs={party.formatting.nativeName} />
              </p>
            ) : null}
            {party.literalName ? (
              <p className="literal-party-name">
                (<RichText text={party.literalName} runs={party.formatting.literalName} />)
              </p>
            ) : null}
            <div className="record-tags">
              {party.labelDetails.map((label) =>
                label.indexVisible ? (
                  <Link key={label.display} href={`/?label=${encodeURIComponent(label.name)}`}>
                    <RichText text={label.display} runs={label.runs} />
                  </Link>
                ) : (
                  <span key={label.display}>
                    <RichText text={label.display} runs={label.runs} />
                  </span>
                ),
              )}
            </div>
          </div>
        </section>

        <div className="record-layout">
          <aside className="panel infobox">
            <div className="section-label">Party details</div>
            <dl>
              {party.acronym ? (
                <InfoRow label="Acronym">
                  <RichText text={party.acronym} runs={party.formatting.acronym} />
                </InfoRow>
              ) : null}
              {established ? <InfoRow label="Established">{established}</InfoRow> : null}
              {registered ? <InfoRow label="Registered">{registered}</InfoRow> : null}
              {delegalised ? <InfoRow label="Delegalised">{delegalised}</InfoRow> : null}
              {dissolved ? <InfoRow label="Dissolved">{dissolved}</InfoRow> : null}
              {party.formerNames ? (
                <InfoRow label="Former names">
                  <RichText text={party.formerNames} runs={party.formatting.formerNames} />
                </InfoRow>
              ) : null}
              {externalLinks.map(({ label, href, text }) =>
                href ? (
                  <InfoRow key={label} label={label}>
                    <a href={href} target="_blank" rel="noreferrer">
                      {text} ↗
                    </a>
                  </InfoRow>
                ) : null,
              )}
            </dl>

            {hasSeats ? (
              <div className="seat-table">
                <h2>Representation</h2>
                <SeatRow
                  color={party.color}
                  label={party.seats.legislatureName}
                  value={party.seats.legislature}
                  total={party.seats.legislatureTotal}
                />
                <SeatRow
                  color={party.color}
                  label={party.seats.lowerHouseName}
                  value={party.seats.lowerHouse}
                  total={party.seats.lowerHouseTotal}
                />
                <SeatRow
                  color={party.color}
                  label={party.seats.upperHouseName}
                  value={party.seats.upperHouse}
                  total={party.seats.upperHouseTotal}
                />
                <SeatRow
                  color={party.color}
                  label="MEPs"
                  value={party.seats.mep}
                  total={party.seats.mepTotal}
                />
              </div>
            ) : null}

            {party.relations ? (
              <section className="relations-panel">
                <h2>Relations</h2>
                <div className="relations-copy">
                  <WikiText text={party.relations} runs={party.formatting.relations} />
                </div>
              </section>
            ) : null}
          </aside>

          <div className="record-main">
            <section className="panel prose-panel">
              <div className="section-label">Overview</div>
              {party.description ? (
                <div className="record-prose">
                  <WikiText text={party.description} runs={party.formatting.description} />
                </div>
              ) : (
                <p className="missing-copy">No descriptive text has been added to this record yet.</p>
              )}
            </section>

            {party.ideology ? (
              <section className="panel prose-panel">
                <div className="section-label">Ideology</div>
                <div className="record-prose">
                  <WikiText text={party.ideology} runs={party.formatting.ideology} />
                </div>
              </section>
            ) : null}

            {party.leadership ? (
              <section className="panel prose-panel">
                <div className="section-label">Leadership</div>
                <div className="record-prose">
                  <WikiText text={party.leadership} runs={party.formatting.leadership} />
                </div>
              </section>
            ) : null}

            {party.formerLogos.length ? (
              <section className="panel archive-panel">
                <div className="section-label">Former logos</div>
                <div className="former-logo-grid">
                  {party.formerLogos.map((item, index) => (
                    <figure key={`${item.url}-${index}`}>
                      <div>
                        <LogoImage
                          src={item.url}
                          alt={item.comment ? `${party.name} logo — ${item.comment}` : `Former ${party.name} logo`}
                          fallback={party.acronym ?? party.name.slice(0, 2)}
                        />
                      </div>
                      <figcaption>
                        {item.comment ? <span className="former-logo-comment">{item.comment}</span> : null}
                        {item.until ? <span>Used until {formatDate(item.until)}</span> : null}
                        {!item.comment && !item.until ? <span>Earlier logo</span> : null}
                      </figcaption>
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
