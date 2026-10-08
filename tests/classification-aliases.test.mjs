import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

test("imports display names and comments using only the last 50 spreadsheet records", () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const uploadedPath = path.join(root, "PPDB database.xlsx");
  const workbook = XLSX.readFile(fs.existsSync(uploadedPath)
    ? uploadedPath
    : path.join(root, "data", "PPDB database.xlsx"));
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
    header: 1,
    raw: true,
    defval: null,
  });
  const columns = Object.fromEntries(rows[1].map((name, index) => [name, index]));
  const records = rows.slice(2).filter((row) => row[columns.ID]).slice(-50);
  const example = [...records.at(-1)];
  example[columns.LABELS] = [
    " Nationalism | North Korean nationalism ",
    " Militarism | Songun # (until 2013) ",
    "Communism",
    "Syncretic #",
    "Socialism |   ",
    "Juche # note | literal",
  ].join("\n");
  example[columns.TYPE] = " Political movement | Association \nParty";
  example[columns.NATIVE_NAME] = "original | literal # text";
  records[records.length - 1] = example;

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ppdb-last-50-"));
  try {
    fs.mkdirSync(path.join(directory, "data"));
    const fixture = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(fixture, XLSX.utils.aoa_to_sheet([
      rows[0], rows[1], ...records,
    ]), "PPDB");
    XLSX.writeFile(fixture, path.join(directory, "PPDB database.xlsx"));
    // A stale data/ copy must not take precedence over the root upload.
    const stale = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(stale, XLSX.utils.aoa_to_sheet([
      rows[0], rows[1], ...records.slice(0, -1),
    ]), "PPDB");
    XLSX.writeFile(stale, path.join(directory, "data", "PPDB database.xlsx"));
    execFileSync(process.execPath, [path.join(root, "scripts", "import-parties.mjs")], {
      cwd: directory,
      stdio: "pipe",
    });

    const database = JSON.parse(fs.readFileSync(path.join(directory, "data", "parties.json")));
    const index = JSON.parse(fs.readFileSync(path.join(directory, "public", "data", "party-index.json")));
    assert.equal(database.count, 50);
    assert.equal(database.source, "PPDB database.xlsx");
    const party = database.parties.find((item) => item.id === example[columns.ID]);
    assert.deepEqual(party.labels, ["Nationalism", "Militarism", "Communism", "Syncretic", "Socialism", "Juche"]);
    assert.deepEqual(party.labelDetails.map(({ name, display, comment, indexVisible, runs }) => ({
      name, display, comment, indexVisible, text: runs.map((run) => run.text).join(""),
    })), [
      { name: "Nationalism", display: "North Korean nationalism", comment: null, indexVisible: true, text: "North Korean nationalism" },
      { name: "Militarism", display: "Songun (until 2013)", comment: "(until 2013)", indexVisible: false, text: "Songun (until 2013)" },
      { name: "Communism", display: "Communism", comment: null, indexVisible: true, text: "Communism" },
      { name: "Syncretic", display: "Syncretic", comment: null, indexVisible: false, text: "Syncretic" },
      { name: "Socialism", display: "Socialism", comment: null, indexVisible: true, text: "Socialism" },
      { name: "Juche", display: "Juche note | literal", comment: "note | literal", indexVisible: false, text: "Juche note | literal" },
    ]);
    assert.deepEqual(party.types, ["Political movement", "Party"]);
    assert.deepEqual(party.typeDetails.map(({ name, display, runs }) => ({
      name, display, text: runs.map((run) => run.text).join(""),
    })), [
      { name: "Political movement", display: "Association", text: "Association" },
      { name: "Party", display: "Party", text: "Party" },
    ]);
    assert.equal(party.nativeName, "original | literal # text");
    const entry = index.parties.find((item) => item.id === party.id);
    assert.deepEqual(entry.typeDetails, party.typeDetails);
    assert.equal(entry.labelDetails[0].name, "Nationalism");
    assert.equal(entry.labelDetails[0].display, "North Korean nationalism");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
