import Link from "next/link";
import { SiteHeader } from "../components/SiteHeader";

const fields = [
  ["COUNTRY", "Required", "Country name used for filtering and grouping."],
  ["ID", "Required", "Stable, unique record ID, e.g. atOVP. Changing it changes the party URL."],
  ["NAME", "Required", "English-language party name."],
  [
    "NATIVE_NAME / LITERAL_NAME / ACRONYM",
    "Text",
    "Native-language name, optional literal English translation and abbreviation.",
  ],
  [
    "LEGISLATURE / LOWER_HOUSE / UPPER_HOUSE / MEP",
    "Number",
    "Current seat counts. Use LEGISLATURE for unicameral systems and leave non-applicable chambers blank.",
  ],
  [
    "LOGO / COLORCODE",
    "Path or URL / hex",
    "Use an external URL or a local path such as /media/logos/atFPO.png, plus a party colour such as #005EA8.",
  ],
  [
    "ESTABLISHMENT / REGISTERED / DELEGALISED / DISSOLUTION",
    "Date",
    "Optional milestone dates. Full dates, month-year values and year-only values are supported; the displayed precision is preserved.",
  ],
  [
    "LABELS",
    "Multiline text",
    "Put one label on each line. A line containing # is hidden from the Index; on the record page, text after # is shown as a comment without the # character.",
  ],
  [
    "TYPE",
    "Multiline text",
    "Record type used for display and filtering. Blank cells default to Party; put multiple types on separate lines.",
  ],
  ["STATUS", "Text", "For example Parliamentary, Extra-parliamentary, Regional, Local or Dissolved."],
  ["RELATIONS", "Long text", "Optional relationship notes displayed below Representation in the left column."],
  ["DESCRIPTION", "Long text", "Main record text. Blank lines create paragraphs."],
  ["Ideology", "Long text", "Optional prose section displayed between Overview and Leadership."],
  ["LEADERSHIP", "Long text", "Plain-text leadership notes shown after the optional Ideology section."],
  [
    "FORMER_LOGO",
    "Multiline text",
    "Put one earlier logo on each line as logo|comment|until. Keep the middle field empty when there is no comment: logo||until.",
  ],
  ["FORMER_NAMES", "Long text", "Earlier official or widely used party names."],
  ["WEBSITE / ARCHIVED_WEBSITE", "URLs", "Current official website and, separately, its archived version."],
  [
    "FACEBOOK / YOUTUBE / XTWITTER / INSTAGRAM / TIKTOK / TELEGRAM / VK",
    "URLs",
    "Official social-media pages displayed as separate links in Party details.",
  ],
  [
    "ALLIANCES",
    "Multiline wiki links",
    "Put one international alliance on each line. The linked record supplies the badge colour. A line containing # is hidden from the Index but remains on the party page with the text after # shown as a comment.",
  ],
  ["LAST_EDITED", "Date", "Optional maintenance date shown at the bottom of the record."],
  ["SOURCES", "URLs", "Put one source URL on each line."],
];

export default function DataGuidePage() {
  return (
    <main className="site-shell">
      <SiteHeader />
      <div className="page-body guide-page">
        <div className="breadcrumbs">
          <Link href="/">Index</Link> <span>›</span> <strong>Data guide</strong>
        </div>

        <section className="guide-heading">
          <span className="eyebrow">PPDB / Editing reference</span>
          <h1>The spreadsheet is the database.</h1>
          <p>
            Add one party per row. Keep the two header rows intact, use stable IDs and leave optional
            cells empty rather than inserting placeholders.
          </p>
        </section>

        <section className="panel guide-panel">
          <div className="section-label">Field reference</div>
          <div className="field-table" role="table" aria-label="Spreadsheet field reference">
            <div className="field-row field-head" role="row">
              <div role="columnheader">Column</div>
              <div role="columnheader">Type</div>
              <div role="columnheader">How PPDB uses it</div>
            </div>
            {fields.map(([field, type, description]) => (
              <div className="field-row" role="row" key={field}>
                <div role="cell"><code>{field}</code></div>
                <div role="cell">{type}</div>
                <div role="cell">{description}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="guide-grid">
          <section className="panel">
            <div className="section-label">Legislature totals</div>
            <div className="guide-copy">
              <p>
                The <code>Legislatures</code> sheet stores the names and totals for unicameral
                legislatures and for each chamber, plus European Parliament totals. PPDB combines
                them with party values and displays entries such as <code>57 / 183</code>.
              </p>
            </div>
          </section>
          <section className="panel">
            <div className="section-label">Local logo storage</div>
            <div className="guide-copy">
              <p>
                Upload logo files to <code>public/media/logos/</code>, then put a path such as
                <code> /media/logos/atFPO.png</code> in the LOGO cell. These files are deployed with
                the site and do not depend on an external image host.
              </p>
            </div>
          </section>
          <section className="panel">
            <div className="section-label">Internal links</div>
            <div className="guide-copy">
              <p>Use one of these forms of the compact wiki-like syntax inside prose fields:</p>
              <pre>{`[[atOVP]]
[[atOVP|Austrian People's Party]]
[[czCSSD|CSSD|#FF0000]]`}</pre>
              <p>
                Without custom text, PPDB displays the target party&apos;s acronym, or its name when no
                acronym exists. The optional third field overrides the colour square with a
                six-digit hex colour. References to IDs without a record are shown as red links.
              </p>
              <p>
                The <code>Redirects</code> sheet maps an old or alternative <code>ID</code> to
                <code> Redirect to</code>. Such links open the target record but use
                <code> ID colorcode</code> for their square. A blank redirect colour falls back to
                the target record&apos;s colour.
              </p>
            </div>
          </section>
          <section className="panel">
            <div className="section-label">Former logos</div>
            <div className="guide-copy">
              <p>Put one logo on each line of <code>FORMER_LOGO</code>:</p>
              <pre>{`/media/logos/Logo1.svg|Used under the former party name|2020-05
/media/logos/Logo2.svg||2004`}</pre>
              <p>
                The comment is optional, but both separators are required. The final field accepts
                a full date, month and year, a year alone, or may be left empty.
              </p>
            </div>
          </section>
          <section className="panel">
            <div className="section-label">International alliances</div>
            <div className="guide-copy">
              <p>Put one wiki-style record link on each line of <code>ALLIANCES</code>:</p>
              <pre>{`[[intUCPCPSU|UCP–CPSU]]
[[suCPSU|CPSU]] # (until 1991)`}</pre>
              <p>
                The first alliance appears on the Index and party page. A line containing
                <code> # </code> is shown only on the party page, where the comment follows the
                alliance name without the hash character.
              </p>
            </div>
          </section>
          <section className="panel">
            <div className="section-label">Import rules</div>
            <div className="guide-copy">
              <ul>
                <li>Rows without an ID are ignored.</li>
                <li>Duplicate IDs stop the build with a clear error.</li>
                <li>COUNTRY, ID and NAME are validated as required.</li>
                <li>Empty sections do not appear on the public page.</li>
                <li>Bold and italic spreadsheet text is preserved without importing font sizes.</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
      <footer>
        <Link href="/">← Return to index page</Link>
        <span>PPDB — Data guide</span>
      </footer>
    </main>
  );
}
