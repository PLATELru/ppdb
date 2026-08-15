import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizePartyLinkColor,
  parsePartyLinkMarkup,
  partyLinkColor,
  partyLinkLabel,
} from "../lib/wiki-links.ts";

test("parses internal links with an optional label and colour override", () => {
  assert.deepEqual(parsePartyLinkMarkup("czCSSD|CSSD|#FF0000"), {
    id: "czCSSD",
    label: "CSSD",
    color: "#FF0000",
  });
  assert.deepEqual(parsePartyLinkMarkup("czCSSD||#f00"), {
    id: "czCSSD",
    label: null,
    color: "#f00",
  });
  assert.deepEqual(parsePartyLinkMarkup("czCSSD"), {
    id: "czCSSD",
    label: null,
    color: null,
  });
  assert.equal(parsePartyLinkMarkup("czCSSD|CSSD|red"), null);
  assert.equal(normalizePartyLinkColor("#FF0000"), "#FF0000");
});

test("gives an explicit link colour priority over redirects and party records", () => {
  assert.equal(partyLinkColor("#FF0000", "#FBAD23", "#00AA00"), "#FF0000");
  assert.equal(partyLinkColor(null, "#FBAD23", "#00AA00"), "#FBAD23");
  assert.equal(partyLinkColor(null, null, "#00AA00"), "#00AA00");
});

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
