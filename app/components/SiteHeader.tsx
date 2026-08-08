import Link from "next/link";
import { ThemeButton } from "./ThemeButton";

export function SiteHeader() {
  return (
    <>
      <header className="site-header">
        <div>
          <Link className="brand" href="/">
            Political Parties Database
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
