import assert from "node:assert/strict";
import test from "node:test";
import database from "../data/parties.json" with { type: "json" };

const byId = new Map(database.parties.map((party) => [party.id, party]));

test("imports the ten current party records", () => {
  assert.equal(database.count, 10);
  assert.equal(byId.size, 10);
});

test("preserves legislature names and partial-date precision", () => {
  const party = byId.get("ltTSLKD");
  assert.equal(party?.seats.legislature, 28);
  assert.equal(party?.seats.legislatureName, "Seimas");
  assert.equal(party?.seats.legislatureTotal, 141);
  assert.equal(party?.formerLogos[0]?.until, "2020-05");
  assert.equal(party?.formerLogos[1]?.until, "2004");
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

test("accepts the three-letter international ID prefix and its cross-reference", () => {
  const international = byId.get("intUCPCPSU");
  assert.equal(international?.country, "International");
  assert.equal(international?.status, "International");
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
