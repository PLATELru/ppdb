// Internal workspace sites can read the authenticated OpenAI user from the
// forwarded request headers:
//
// import { headers } from "next/headers";
//
// export default async function Home() {
//   const requestHeaders = await headers();
//   const email = requestHeaders.get("oai-authenticated-user-email");
//   const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
//   const fullName =
//     encodedFullName &&
//     requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
//       "percent-encoded-utf-8"
//       ? decodeURIComponent(encodedFullName)
//       : null;
//   const displayName = fullName ?? email;
//   // ...
// }

import { PartyDirectory } from "./components/PartyDirectory";
import { SiteHeader } from "./components/SiteHeader";
import { countries, parties } from "../lib/parties";

export default function Home() {
  return (
    <main className="site-shell">
      <SiteHeader />
      <div className="page-body">
        <section className="intro-strip" id="about">
          <div>
            <span className="eyebrow">PPDB / Index</span>
            <h1>Explore parties from all over the world, without borders.</h1>
          </div>
          <p>
            This project is not a reliable source of information and was created by a single
            enthusiast, it should <strong>not</strong> be used for serious purposes. Some information
            may be outdated or dubious.
          </p>
        </section>

        <PartyDirectory countries={countries} parties={parties} />
      </div>
      <footer>
        <span>PPDB — Political Parties Database</span>
        <span>
          PPDB is not a reliable source. Any data from PPDB is provided for reference <strong>should
          not</strong> be used for serious purposes. Vibecoded by real humans.
        </span>
      </footer>
    </main>
  );
}
