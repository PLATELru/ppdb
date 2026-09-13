import type { Metadata } from "next";
import Link from "next/link";
import { FooterXLink } from "../components/FooterXLink";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = {
  title: "Contact — PPDB",
};

const partnerSites = [
  "https://bananasareviolet.github.io/epgroupbuilder/",
  "https://bananasareviolet.github.io/eestimate/",
  "https://hok-brag.github.io/",
];

export default function ContactPage() {
  return (
    <main className="site-shell">
      <SiteHeader />
      <div className="page-body contact-page">
        <div className="breadcrumbs">
          <Link href="/">Index</Link> <span>›</span> <strong>Contact</strong>
        </div>

        <section className="panel contact-panel">
          <div className="section-label">Contact</div>
          <a href="https://x.com/partiesdatabase" target="_blank" rel="noreferrer">
            https://x.com/partiesdatabase
          </a>
        </section>

        <section className="panel contact-panel">
          <div className="section-label">Partner sites</div>
          <div className="contact-links">
            {partnerSites.map((url) => (
              <a href={url} target="_blank" rel="noreferrer" key={url}>{url}</a>
            ))}
          </div>
        </section>
      </div>
      <footer>
        <Link href="/">← Return to index page</Link>
        <span>PPDB — Contact</span>
        <FooterXLink />
      </footer>
    </main>
  );
}
