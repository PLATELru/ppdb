import Link from "next/link";
import { ThemeButton } from "./ThemeButton";

export function SiteHeader() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  return (
    <>
      <header className="site-header">
        <div className="site-identity">
          <Link className="brand" href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${basePath}/branding/PPDB.png`} alt="PPDB logo" />
            <span>Political Parties Database</span>
          </Link>
          <p>Open-source database of political parties worldwide.</p>
        </div>
        <ThemeButton />
      </header>
      <nav className="main-nav" aria-label="Primary navigation">
        <Link href="/">Index</Link>
        <Link href="/#about">About</Link>
        <Link href="/data-guide">Data guide</Link>
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
