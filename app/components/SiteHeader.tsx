import { ThemeButton } from "./ThemeButton";

export function SiteHeader() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  return (
    <>
      <header className="site-header">
        <div className="site-identity">
          <a className="brand" href={`${basePath}/`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${basePath}/branding/PPDB.png`} alt="PPDB logo" />
            <span>Political Parties Database</span>
          </a>
          <p>Open-source database of political parties worldwide.</p>
        </div>
        <ThemeButton />
      </header>
      <nav className="main-nav" aria-label="Primary navigation">
        <a href={`${basePath}/`}>Index</a>
        <a href={`${basePath}/#about`}>About</a>
        <a href={`${basePath}/data-guide/`}>Data guide</a>
        <a
          href="https://github.com/PLATELru/ppdb/blob/main/data/PPDB%20database.xlsx"
          target="_blank"
          rel="noreferrer"
        >
          Party spreadsheet
        </a>
      </nav>
    </>
  );
}
