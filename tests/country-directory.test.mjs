import assert from "node:assert/strict";
import test from "node:test";
import { getCountryDirectory } from "../lib/country-directory.ts";
import { sortCountries } from "../lib/country-sort.ts";

function party(id, seats, extra = {}) {
  return {
    id, name: id, acronym: id, color: "#123456", country: "Example",
    countries: ["Example"], types: ["Party"], dissolved: null,
    seats: {
      legislature: null, legislatureName: "Assembly", legislatureTotal: null,
      lowerHouse: null, lowerHouseName: "Lower", lowerHouseTotal: null,
      upperHouse: null, upperHouseName: "Upper", upperHouseTotal: null,
      ...seats,
    },
    ...extra,
  };
}

const country = { name: "Example", coverage: "Almost all", type: null, lastRevision: null };

test("keeps lower-house leaders and their upper seats, including zero and missing data", () => {
  const [entry] = getCountryDirectory([country], [
    party("Leader", { lowerHouse: 98, upperHouse: 0 }),
    party("Tied", { lowerHouse: 98, upperHouse: null }),
    party("Upper leader", { lowerHouse: 40, upperHouse: 100 }),
    party("Dissolved", { lowerHouse: 200 }, { dissolved: "2020" }),
    party("Coalition", { lowerHouse: 300 }, { types: ["Coalition"] }),
  ]);
  assert.equal(entry.partyCount, 5);
  assert.deepEqual(entry.biggestParties.map(({ id }) => id), ["Leader", "Tied"]);
  assert.equal(entry.biggestParties[0].houses.lower.seats, 98);
  assert.equal(entry.biggestParties[0].houses.upper.seats, 0);
  assert.equal(entry.biggestParties[1].houses.upper.seats, null);
});

test("preserves a single seat value in unicameral parliaments and ranks upper-only records", () => {
  const [sole] = getCountryDirectory([country], [party("Sole", { legislature: 30 })]);
  assert.equal(sole.biggestParties[0].seats, 30);
  assert.equal(sole.biggestParties[0].houses, null);
  const [upper] = getCountryDirectory([country], [party("Upper", { upperHouse: 12 })]);
  assert.equal(upper.biggestParties[0].seats, 12);
  assert.equal(upper.biggestParties[0].houses.lower.seats, null);
  assert.equal(upper.biggestParties[0].houses.upper.seats, 12);
});

test("sorts numbers, coverage, dates and seat counts with missing data last", () => {
  const entries = [
    { ...country, name: "Alpha", partyCount: 100, lastRevision: "2026-08", biggestParties: [{ seats: 30 }] },
    { ...country, name: "Beta", coverage: "Only a few", partyCount: 20, lastRevision: "2026-11", biggestParties: [{ seats: 9 }] },
    { ...country, name: "Gamma", coverage: null, partyCount: 0, biggestParties: [] },
  ];
  const names = (key, direction) => sortCountries(entries, key, direction).map(({ name }) => name);
  assert.deepEqual(names("name", "desc"), ["Gamma", "Beta", "Alpha"]);
  assert.deepEqual(names("partyCount", "desc"), ["Alpha", "Beta", "Gamma"]);
  assert.deepEqual(names("coverage", "desc"), ["Alpha", "Beta", "Gamma"]);
  assert.deepEqual(names("coverage", "asc"), ["Beta", "Alpha", "Gamma"]);
  assert.deepEqual(names("lastRevision", "desc"), ["Beta", "Alpha", "Gamma"]);
  assert.deepEqual(names("lastRevision", "asc"), ["Alpha", "Beta", "Gamma"]);
  assert.deepEqual(names("seats", "asc"), ["Beta", "Alpha", "Gamma"]);
  assert.deepEqual(entries.map(({ name }) => name), ["Alpha", "Beta", "Gamma"]);
});
