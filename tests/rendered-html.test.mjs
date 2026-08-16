import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

async function fetchHtml(path = "/") {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 200);
  return response.text();
}

test("renders development preview metadata", async () => {
  assert.match(await fetchHtml(), developmentPreviewMeta);
});

test("renders the type filter and seat sort while retaining lifespan support", async () => {
  const [html, component] = await Promise.all([
    fetchHtml(),
    readFile(new URL("../app/components/PartyDirectory.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(html, />Type</);
  assert.match(html, /Parliamentary seats/);
  assert.match(html, /Oldest first/);
  assert.match(component, /formatLifeSpan\(party\.established, party\.dissolved\)/);
});

test("uses seat sorting by default and credits humans for the entries", async () => {
  const [html, component] = await Promise.all([
    fetchHtml(),
    readFile(new URL("../app/components/PartyDirectory.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(component, /comparePartiesBySeats/);
  assert.match(component, /useState\("seats"\)/);
  assert.match(
    html,
    /The website structure was vibecoded using ChatGPT\. All entries were added by humans\./,
  );
});

test("renders optional registration and delegalisation dates only on party pages", async () => {
  const indexHtml = await fetchHtml();
  assert.doesNotMatch(indexHtml, />Registered</);
  assert.doesNotMatch(indexHtml, />Delegalised</);

  const registeredHtml = await fetchHtml("/party/kzAdilet");
  assert.match(registeredHtml, />Registered</);
  assert.match(registeredHtml, /6 January 2026/);

  const delegalisedHtml = await fetchHtml("/party/ruKPRSFSR");
  assert.match(delegalisedHtml, />Delegalised</);
  assert.match(delegalisedHtml, /6 November 1991/);
});

test("renders archived websites and social-media links in Party details", async () => {
  const [uskorenieHtml, gerbHtml, ppHtml, unitedRussiaHtml] = await Promise.all([
    fetchHtml("/party/bgUskorenie"),
    fetchHtml("/party/bgGERB"),
    fetchHtml("/party/bgPP"),
    fetchHtml("/party/ruER"),
  ]);

  assert.match(uskorenieHtml, />Archived website</);
  assert.match(uskorenieHtml, /href="https:\/\/www\.facebook\.com\/klubuskorenie"/);
  assert.match(gerbHtml, /href="https:\/\/www\.youtube\.com\/@gerb-official"/);
  assert.match(gerbHtml, /href="https:\/\/x\.com\/PPGERB"/);
  assert.match(ppHtml, /href="https:\/\/www\.instagram\.com\/prodalzhavamepromyanata\/"/);
  assert.match(ppHtml, /href="https:\/\/www\.tiktok\.com\/@promenibg"/);
  assert.match(unitedRussiaHtml, /href="https:\/\/t\.me\/er_molnia"/);
  assert.match(unitedRussiaHtml, /href="https:\/\/vk\.ru\/er_ru"/);
});

test("renders commented labels and optional prose without hash markers", async () => {
  const jpHtml = await fetchHtml("/party/peJP");
  assert.match(jpHtml, /Castillismo \(factions, since 2025\)/);
  assert.doesNotMatch(jpHtml, /Castillismo\s*#/);

  const bdpHtml = await fetchHtml("/party/peBDP");
  assert.match(bdpHtml, />Relations</);
  assert.match(bdpHtml, /Centre-left to left-wing bloc\./);
});

test("links breadcrumb countries to their selected Index view", async () => {
  const html = await fetchHtml("/party/ruKPRF");
  assert.match(html, /href="\/\?country=Russia#party-index-heading">Russia<\/a>/);
});

test("renders alliance badges with target colours and record-only comments", async () => {
  const [indexHtml, recordHtml, styles] = await Promise.all([
    fetchHtml(),
    fetchHtml("/party/ruKPRF"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  const partyNamePosition = indexHtml.indexOf("Communist Party of the Russian Federation");
  assert.notEqual(partyNamePosition, -1);
  const cardExcerpt = indexHtml.slice(Math.max(0, partyNamePosition - 3000), partyNamePosition + 3000);
  assert.match(cardExcerpt, /href="\/party\/intUCPCPSU"/);
  assert.match(cardExcerpt, />UCP–CPSU<\/a>/);
  assert.doesNotMatch(cardExcerpt, /CPSU \(until 1991\)/);
  assert.match(recordHtml, />International alliances</);
  assert.match(recordHtml, /href="\/party\/intUCPCPSU"/);
  assert.match(recordHtml, /href="\/party\/suCPSU"/);
  assert.match(recordHtml, /CPSU \(until 1991\)/);
  assert.match(recordHtml, /--alliance-color:#DD0302/);
  assert.match(styles, /var\(--alliance-color/);
});

test("resolves redirect links while keeping redirect colours", async () => {
  const [relationsHtml, allianceHtml] = await Promise.all([
    fetchHtml("/party/euESN"),
    fetchHtml("/party/mtAlpha"),
  ]);
  assert.match(relationsHtml, /--party-link-color:#184388/);
  assert.match(relationsHtml, /href="\/party\/euPatriots"[^>]*>Identity and Democracy Party<\/a>/);
  assert.match(allianceHtml, /--alliance-color:#FBAD23/);
  assert.match(allianceHtml, /href="\/party\/euALDE"[^>]*>ELDR<\/a>/);
});

test("stores Index controls, pagination and scroll position in browser history", async () => {
  const component = await readFile(
    new URL("../app/components/PartyDirectory.tsx", import.meta.url),
    "utf8",
  );
  assert.match(component, /ppdbIndexState/);
  assert.match(component, /window\.sessionStorage\.setItem/);
  assert.match(component, /query,\s*sort,\s*view,\s*limit: renderLimit,\s*scrollY: window\.scrollY/s);
  assert.match(component, /pendingScrollRef/);
  assert.match(component, /window\.scrollTo/);
  assert.match(component, /url\.hash = `party-\$\{partyId\}`/);
  assert.match(component, /id=\{`party-\$\{party\.id\}`\}/);
});

test("renders missing party references as red links", async () => {
  const html = await fetchHtml("/party/atFPO");
  assert.match(html, /class="missing-party-link"/);
  assert.match(html, /href="\/party\/atVdU"/);
  assert.match(html, />Federation of Independents<\/a>/);
});

test("renders proportional seat bars when legislature totals are known", async () => {
  const html = await fetchHtml("/party/ruER");
  assert.match(html, /role="progressbar"/);
  assert.match(html, /aria-label="State Duma: 315 of 450 seats"/);
  assert.match(html, /--seat-share:70%/);
  assert.match(html, /aria-label="Federation Council: 136 of 178 seats"/);
});

test("renders former-logo dates from the multiline spreadsheet field", async () => {
  const html = await fetchHtml("/party/ltTSLKD");
  assert.match(html, />Former logos</);
  assert.match(html, /Used until (?:<!-- -->)?May 2020/);
  assert.match(html, /Used until (?:<!-- -->)?2004/);
});

test("sizes each visible logo frame to the source aspect ratio without a cropped duplicate", async () => {
  const [component, styles] = await Promise.all([
    readFile(new URL("../app/components/LogoImage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(component, /--logo-aspect/);
  assert.match(component, /logo-frame-\$\{frame\?\.orientation/);
  assert.doesNotMatch(component, /logo-edge-fill/);
  assert.match(styles, /\.logo-frame-landscape[\s\S]*?width: calc\(100% - 2px\)/);
  assert.match(styles, /\.party-logo-wrap \{[\s\S]*?--logo-frame-size: var\(--card-logo-size, 92px\)/);
  assert.match(styles, /\.logo-frame-portrait[\s\S]*?height: calc\(var\(--logo-frame-size, 100%\) - 2px\)/);
  assert.match(styles, /\.party-logo-wrap \{[\s\S]*?overflow: visible;/);
  assert.match(styles, /\.logo-image-stack \{[\s\S]*?max-height: calc\(var\(--logo-frame-size, 100%\) - 2px\)/);
  assert.match(styles, /\.logo-image-stack > img[\s\S]*?object-fit: contain;/);
  assert.doesNotMatch(styles, /object-fit: cover/);
});

test("keeps record-page logos at the record wrapper size", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(styles, /\.record-logo-wrap \{[\s\S]*?width: 150px;[\s\S]*?height: 150px;/);
  assert.match(styles, /\.logo-image-stack \{[\s\S]*?max-width: calc\(var\(--logo-frame-size, 100%\) - 2px\)/);
});

test("renders the index in batches of 100 and observes the scroll sentinel", async () => {
  const component = await readFile(
    new URL("../app/components/PartyDirectory.tsx", import.meta.url),
    "utf8",
  );

  assert.match(component, /const INDEX_PAGE_SIZE = 100/);
  assert.match(component, /visible\.slice\(0, renderLimit\)/);
  assert.match(component, /new IntersectionObserver/);
  assert.match(component, /current\.limit : INDEX_PAGE_SIZE\) \+ INDEX_PAGE_SIZE/);
  assert.match(component, /ref=\{loadMoreRef\}/);
});

test("ships only a compact first batch and loads the complete index after hydration", async () => {
  const [html, component, page, rawIndex] = await Promise.all([
    fetchHtml(),
    readFile(new URL("../app/components/PartyDirectory.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/data/party-index.json", import.meta.url), "utf8"),
  ]);
  const index = JSON.parse(rawIndex);

  assert.equal((html.match(/class="party-card"/g) ?? []).length, 100);
  assert.match(page, /\.slice\(0, INDEX_PAGE_SIZE\)/);
  assert.match(component, /fetch\(`\$\{basePath\}\/data\/party-index\.json`/);
  assert.doesNotMatch(component, /from ["']\.\.\/\.\.\/lib\/parties["']/);
  assert.equal(index.count, index.parties.length);
  assert.equal(Object.hasOwn(index.parties[0], "description"), false);
  assert.equal(Object.hasOwn(index.parties[0], "sources"), false);
});

test("keeps cards separated before hydration and enables masonry in a layout effect", async () => {
  const [component, styles] = await Promise.all([
    readFile(new URL("../app/components/PartyDirectory.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(styles, /\.party-grid \{[\s\S]*?grid-auto-flow: row;[\s\S]*?grid-auto-rows: auto;/);
  assert.match(styles, /\.party-grid\.masonry-ready \{[\s\S]*?grid-auto-flow: dense;[\s\S]*?grid-auto-rows: 1px;/);
  assert.match(component, /useLayoutEffect\(\(\) => \{[\s\S]*?classList\.add\("masonry-ready"\)/);
  assert.match(component, /const measurements = cards\.map/);
  assert.match(component, /measurements\.forEach/);
});

test("uses generated low-resolution thumbnails only for locally stored PNG logos", async () => {
  const [component, generator] = await Promise.all([
    readFile(new URL("../app/components/LogoImage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../scripts/generate-logo-thumbnails.mjs", import.meta.url), "utf8"),
  ]);

  assert.match(component, /\/media\/logo-thumbnails\//);
  assert.match(component, /decoding="async"/);
  assert.match(component, /fetchPriority=\{thumbnail \? "low" : undefined\}/);
  assert.match(component, /\/media\\\/logos\\\/.\+\\\.png\$\/i/);
  assert.doesNotMatch(component, /jpe\?g\|png\|svg/);
  assert.match(generator, /new Set\(\["\.png"\]\)/);
  assert.match(generator, /width: 192/);
  assert.match(generator, /\.webp\(/);
});

test("defers large filter updates and provides a fixed back-to-top control", async () => {
  const [component, styles] = await Promise.all([
    readFile(new URL("../app/components/PartyDirectory.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(component, /useDeferredValue\(query\)/);
  assert.match(component, /useDeferredValue\(activeLabel\)/);
  assert.match(component, /aria-label="Back to top"/);
  assert.match(component, /window\.scrollTo\(\{ top: 0/);
  assert.match(styles, /\.back-to-top \{[\s\S]*?position: fixed;/);
});

test("renders primary navigation as native links that work before hydration", async () => {
  const [html, header] = await Promise.all([
    fetchHtml(),
    readFile(new URL("../app/components/SiteHeader.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(html, /href="\/data-guide\/">Data guide<\/a>/);
  assert.doesNotMatch(header, /from "next\/link"/);
});
