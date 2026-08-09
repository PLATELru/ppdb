import assert from "node:assert/strict";
import test from "node:test";
import database from "../data/parties.json" with { type: "json" };

const byId = new Map(database.parties.map((party) => [party.id, party]));

test("imports the five current party records", () => {
  assert.equal(database.count, 5);
  assert.equal(byId.size, 5);
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
});
