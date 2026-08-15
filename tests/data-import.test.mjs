import assert from "node:assert/strict";
import test from "node:test";
import database from "../data/parties.json" with { type: "json" };

const byId = new Map(database.parties.map((party) => [party.id, party]));

test("imports every current party record", () => {
  assert.equal(database.schemaVersion, 9);
  assert.equal(database.count, database.parties.length);
  assert.equal(byId.size, database.count);
  assert.ok(byId.has("bgUskorenie"));
});

test("imports and resolves redirect IDs with their historical colours", () => {
  const redirects = new Map(database.redirects.map((redirect) => [redirect.id, redirect]));
  assert.deepEqual(redirects.get("euELDR"), {
    id: "euELDR",
    targetId: "euALDE",
    color: "#FBAD23",
  });
  assert.deepEqual(redirects.get("euMENF"), {
    id: "euMENF",
    targetId: "euPatriots",
    color: "#004B93",
  });
  assert.equal(redirects.get("euECPM")?.targetId, "euECPP");
  assert.equal(redirects.get("euECPM")?.color, byId.get("euECPP")?.color);
});

test("imports archived websites and social-media links", () => {
  const uskorenie = byId.get("bgUskorenie");
  assert.equal(uskorenie?.name, "Uskorenie");
  assert.equal(
    uskorenie?.archivedWebsite,
    "https://web.archive.org/web/20250330190525/https://uskorenie.bg/",
  );
  assert.equal(uskorenie?.socials.facebook, "https://www.facebook.com/klubuskorenie");
  assert.equal(byId.get("bgGERB")?.socials.youtube, "https://www.youtube.com/@gerb-official");
  assert.equal(byId.get("bgGERB")?.socials.x, "https://x.com/PPGERB");
  assert.equal(byId.get("bgPP")?.socials.instagram, "https://www.instagram.com/prodalzhavamepromyanata/");
  assert.equal(byId.get("bgPP")?.socials.tiktok, "https://www.tiktok.com/@promenibg");
  assert.equal(byId.get("ruER")?.socials.telegram, "https://t.me/er_molnia");
  assert.equal(byId.get("ruER")?.socials.vk, "https://vk.ru/er_ru");
});

test("preserves legislature names and partial-date precision", () => {
  const party = byId.get("ltTSLKD");
  assert.equal(party?.seats.legislature, 28);
  assert.equal(party?.seats.legislatureName, "Seimas");
  assert.equal(party?.seats.legislatureTotal, 141);
  assert.equal(party?.formerLogos[0]?.until, "2020-05");
  assert.equal(party?.formerLogos[1]?.until, "2004");
  assert.equal(party?.formerLogos[0]?.comment, null);
  assert.equal(party?.formerLogos[1]?.comment, null);
});

test("imports optional registration and delegalisation dates", () => {
  assert.equal(byId.get("kzAdilet")?.registered, "2026-01-06");
  assert.equal(byId.get("ruKPRSFSR")?.delegalised, "1991-11-06");
  assert.equal(byId.get("atOVP")?.registered, null);
  assert.equal(byId.get("atOVP")?.delegalised, null);
});

test("imports literal names, leadership and spreadsheet emphasis", () => {
  assert.equal(byId.get("ltSajudis")?.literalName, "Reform Movement of Lithuania");
  assert.match(byId.get("ltSajudis")?.leadership ?? "", /Vytautas Landsbergis/);
  assert.equal(byId.get("atOVP")?.formatting.formerNames[0]?.bold, true);
  assert.equal(byId.get("atOVP")?.formatting.formerNames[0]?.italic, false);
  assert.deepEqual(
    byId.get("suCPSU")?.formatting.leadership.filter((run) => run.bold || run.italic),
    [
      { text: "De facto presiding", bold: true, italic: true },
      { text: " Secretary of the Central Committee:", bold: true, italic: false },
      { text: "First Secretary of the Central Committee:", bold: true, italic: false },
      { text: "General Secretary of the Central Committee:\n", bold: true, italic: false },
      {
        text: "Vladimir Ivashko (acting, 24 August 1991–6 November 1991)",
        bold: false,
        italic: true,
      },
    ],
  );
});

test("imports multiline labels, comments and record types", () => {
  const fpo = byId.get("atFPO");
  const formerLabel = fpo?.labelDetails.find((label) => label.name === "National liberalism");
  assert.equal(formerLabel?.display, "National liberalism (former)");
  assert.equal(formerLabel?.comment, "(former)");
  assert.equal(formerLabel?.indexVisible, false);
  assert.deepEqual(byId.get("atOVP")?.types, ["Party"]);
  assert.deepEqual(byId.get("peJP")?.types, ["Party", "Coalition"]);
});

test("imports international alliances, their colours and Index visibility", () => {
  const kprf = byId.get("ruKPRF");
  assert.deepEqual(
    kprf?.alliances.map(({ id, name, display, comment, indexVisible, color }) => ({
      id,
      name,
      display,
      comment,
      indexVisible,
      color,
    })),
    [
      {
        id: "intUCPCPSU",
        name: "UCP–CPSU",
        display: "UCP–CPSU",
        comment: null,
        indexVisible: true,
        color: "#DD0302",
      },
      {
        id: "suCPSU",
        name: "CPSU",
        display: "CPSU (until 1991)",
        comment: "(until 1991)",
        indexVisible: false,
        color: byId.get("suCPSU")?.color,
      },
    ],
  );
  assert.equal(byId.get("ruKPRSFSR")?.alliances[0]?.id, "suCPSU");
  assert.equal(byId.get("ruKPRSFSR")?.alliances[0]?.indexVisible, true);
  assert.equal(byId.get("mtAlpha")?.alliances[0]?.sourceId, "euELDR");
  assert.equal(byId.get("mtAlpha")?.alliances[0]?.id, "euALDE");
  assert.equal(byId.get("mtAlpha")?.alliances[0]?.color, "#FBAD23");
});

test("imports optional ideology and relations sections", () => {
  const dissolved = byId.get("peBDP");
  assert.equal(dissolved?.established, "2022-04-12");
  assert.equal(dissolved?.dissolved, "2026-07-26");
  assert.equal(dissolved?.ideology, "Centre-left to left-wing bloc.");
  assert.match(dissolved?.relations ?? "", /\[\[peJP\|Together for Peru\]\]/);
  assert.equal(byId.get("peJP")?.ideology, null);
  assert.match(byId.get("peJP")?.relations ?? "", /\[\[peANTAURO\|ANTAURO\]\]/);
  assert.equal(byId.get("atOVP")?.ideology, null);
  assert.equal(byId.get("atOVP")?.relations, null);
});

test("accepts the three-letter international ID prefix and its cross-reference", () => {
  const international = byId.get("intUCPCPSU");
  assert.equal(international?.country, "International");
  assert.equal(international?.status, "Active");
  assert.match(byId.get("suCPSU")?.description ?? "", /\[\[intUCPCPSU\|/);
});

test("preserves spreadsheet line breaks inside rich text", () => {
  const party = byId.get("ruKPRF");
  assert.equal(
    party?.nativeName,
    "Коммунистическая партия Российской Федерации\nKommunisticheskaya partiya Rossiyskoy Federatsiyi",
  );
  assert.equal(party?.formatting.nativeName[0]?.text.endsWith("\n"), true);
  assert.equal(party?.formatting.nativeName[1]?.italic, true);
});
