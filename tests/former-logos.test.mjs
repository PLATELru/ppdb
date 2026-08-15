import assert from "node:assert/strict";
import test from "node:test";
import { parseFormerLogos } from "../lib/former-logos.mjs";

test("parses multiline former logos with optional comments", () => {
  assert.deepEqual(
    parseFormerLogos(
      "/media/logos/Logo1.svg|Used under the former party name|2020-05\n/media/logos/Logo2.svg||2004",
    ),
    [
      {
        url: "/media/logos/Logo1.svg",
        comment: "Used under the former party name",
        until: "2020-05",
      },
      { url: "/media/logos/Logo2.svg", comment: null, until: "2004" },
    ],
  );
});

test("normalizes European dates and permits an empty until field", () => {
  assert.deepEqual(parseFormerLogos("Logo.svg|Old identity|26-11-2005\nLogo2.svg||"), [
    { url: "Logo.svg", comment: "Old identity", until: "2005-11-26" },
    { url: "Logo2.svg", comment: null, until: null },
  ]);
});

test("rejects malformed former-logo lines", () => {
  assert.throws(() => parseFormerLogos("Logo.svg|2020"), /expected logo\|comment\|until/);
  assert.throws(() => parseFormerLogos("||2020"), /logo path or URL is empty/);
  assert.throws(() => parseFormerLogos("Logo.svg||2020-13"), /invalid until date/);
});
