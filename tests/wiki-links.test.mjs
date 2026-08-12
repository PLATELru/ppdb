import assert from "node:assert/strict";
import test from "node:test";
import { partyLinkLabel } from "../lib/wiki-links.ts";

test("uses an explicit internal-link label when one is provided", () => {
  assert.equal(
    partyLinkLabel({ acronym: "GERB", name: "Citizens for European Development of Bulgaria" }, "bgGERB", "Custom label"),
    "Custom label",
  );
});

test("uses the party acronym, then name and ID for compact internal links", () => {
  assert.equal(
    partyLinkLabel({ acronym: "GERB", name: "Citizens for European Development of Bulgaria" }, "bgGERB"),
    "GERB",
  );
  assert.equal(partyLinkLabel({ acronym: null, name: "Uskorenie" }, "bgUskorenie"), "Uskorenie");
  assert.equal(partyLinkLabel(undefined, "missingParty"), "missingParty");
});
