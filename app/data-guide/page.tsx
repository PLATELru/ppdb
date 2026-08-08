import Link from "next/link";
import { SiteHeader } from "../components/SiteHeader";

const fields = [
  ["COUNTRY", "Required", "Country name used for filtering and grouping."],
  ["ID", "Required", "Stable, unique record ID, e.g. atOVP. Changing it changes the party URL."],
  ["NAME", "Required", "English-language party name."],
  ["NATIVE_NAME / ACRONYM", "Text", "Optional native-language name and abbreviation."],
  ["LOWER_HOUSE / UPPER_HOUSE / MEP", "Number", "Current seat counts. Leave blank when not applicable."],
  ["LOGO / COLORCODE", "URL / hex", "Current logo URL and party colour, e.g. #005EA8."],
  ["ESTABLISHMENT / DISSOLUTION", "Date", "Use true spreadsheet dates, not prose."],
  ["LABEL1–LABEL5", "Text", "Ideology, political position or other concise classification labels."],
  ["STATUS", "Text", "For example Parliamentary, Extra-parliamentary, Regional, Local or Dissolved."],
  ["DESCRIPTION", "Long text", "Main record text. Blank lines create paragraphs."],
  ["FORMER_LOGO1–5", "URL + date", "Earlier logos and their final dates of use."],
  ["FORMER_NAMES", "Long text", "Earlier official or widely used party names."],
  ["WEBSITE", "URL", "Official website or an archived version."],
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
            <div className="section-label">Internal links</div>
            <div className="guide-copy">
              <p>Use the compact wiki-like syntax below inside DESCRIPTION:</p>
              <pre>[[atOVP|Austrian People&apos;s Party]]</pre>
              <p>The first value is the target ID. If that ID is absent, PPDB shows ordinary text instead of a broken link.</p>
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
