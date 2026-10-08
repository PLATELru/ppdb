import assert from "node:assert/strict";
import test from "node:test";
import {
  getPartyIndexVersion,
  getPartySearchText,
} from "../lib/party-index.ts";

function indexParty(overrides = {}) {
  return {
    id: "euINITIATIVE",
    country: "European Union",
    countries: ["European Union"],
    name: "Initiative of Communist and Workers' Parties",
    nativeName: null,
    literalName: null,
    acronym: "INITIATIVE",
    formerNames: null,
    types: ["Coalition"],
    typeDetails: [{ name: "Coalition", display: "Coalition", runs: [] }],
    status: "Dissolved",
    established: null,
    establishmentDates: [],
    dissolved: null,
    dissolutionDates: [],
    lifePeriods: [],
    seats: {},
    color: "#ff0000",
    logo: null,
    labelDetails: [],
    alliances: [],
    formatting: {},
    ...overrides,
  };
}

test("includes record IDs in the Index search text", () => {
  assert.match(getPartySearchText(indexParty()), /euinitiative/);
});

test("includes every listed country in the Index search text", () => {
  const searchText = getPartySearchText(
    indexParty({ country: "Serbia", countries: ["Serbia", "Kosovo"] }),
  );
  assert.match(searchText, /serbia/);
  assert.match(searchText, /kosovo/);
});

test("searches both canonical labels and their displayed names", () => {
  const searchText = getPartySearchText(indexParty({
    labelDetails: [{ name: "Nationalism", display: "North Korean nationalism" }],
    types: ["Political movement"],
    typeDetails: [{ name: "Political movement", display: "Association" }],
  }));
  assert.match(searchText, /north korean nationalism/);
  assert.match(searchText, /political movement/);
  assert.match(searchText, /association/);
});

test("changes the index cache key when searchable data changes", () => {
  const original = getPartyIndexVersion([indexParty()]);
  const changed = getPartyIndexVersion([indexParty({ name: "Updated name" })]);
  assert.notEqual(original, changed);
});
