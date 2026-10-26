import assert from "node:assert/strict";
import test from "node:test";
import { resolveLogoReference } from "../lib/logo-reference.mjs";
import { parseFormerLogos } from "../lib/former-logos.mjs";

test("spreadsheet logos accept filenames, direct URLs and retained legacy paths", () => {
  assert.equal(resolveLogoReference(" uaSolidarnist.png "), "/media/logos/uaSolidarnist.png");
  assert.equal(resolveLogoReference("rsNPS1.png"), "/media/logos/rsNPS1.png");
  assert.equal(resolveLogoReference("Party.JPG?v=2"), "/media/logos/Party.JPG?v=2");
  assert.equal(resolveLogoReference("https://images.example/logo?id=123"), "https://images.example/logo?id=123");
  assert.equal(resolveLogoReference("/media/logos2/rsNPS.png"), "/media/logos/rsNPS.png");
  assert.equal(resolveLogoReference("/media/logos3/atFPO.png"), "/media/logos/atFPO-alt.png");
  assert.equal(resolveLogoReference("/media/other/logo.svg"), "/media/other/logo.svg");
  assert.equal(resolveLogoReference(null), null);
  assert.throws(() => resolveLogoReference("../private.png"), /expected an image filename/);
  assert.throws(() => resolveLogoReference("1992"), /expected an image filename/);
  assert.throws(() => resolveLogoReference("javascript:alert(1)"), /expected an image filename/);
});

test("former logos resolve filenames while retaining comments and dates", () => {
  assert.deepEqual(parseFormerLogos("rsNPS1.png|Earlier identity|22-10-2017\nhttps://images.example/old.svg||2010"), [
    { url: "/media/logos/rsNPS1.png", comment: "Earlier identity", until: "2017-10-22" },
    { url: "https://images.example/old.svg", comment: null, until: "2010" },
  ]);
});
