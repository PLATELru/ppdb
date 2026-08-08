import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const root = process.cwd();
const inputPath = path.join(root, "data", "PPDB database.xlsx");
const outputPath = path.join(root, "data", "parties.json");

const workbook = XLSX.readFile(inputPath, { cellDates: false });
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet, {
  header: 1,
  raw: true,
  defval: null,
});

const headers = (rows[1] ?? []).map((value) => String(value ?? "").trim());
const index = Object.fromEntries(headers.map((header, column) => [header, column]));
const valueAt = (row, key) => row[index[key]] ?? null;

function text(value) {
  const result = value == null ? "" : String(value).trim();
  return result || null;
}

function number(value) {
  if (value == null || value === "") return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

const legislatureSheet = workbook.Sheets.Legislatures;
const legislatureRows = legislatureSheet
  ? XLSX.utils.sheet_to_json(legislatureSheet, { header: 1, raw: true, defval: null })
  : [];
const legislatureHeaders = (legislatureRows[1] ?? []).map((value) =>
  String(value ?? "").trim(),
);
const legislatureIndex = Object.fromEntries(
  legislatureHeaders.map((header, column) => [header, column]),
);
const legislatureTotals = new Map(
  legislatureRows.slice(2).flatMap((row) => {
    const country = text(row[legislatureIndex.COUNTRY]);
    if (!country) return [];
    return [
      [
        country,
        {
          lowerHouse: number(row[legislatureIndex.LOWER_HOUSE_TOTAL]),
          upperHouse: number(row[legislatureIndex.UPPER_HOUSE_TOTAL]),
          mep: number(row[legislatureIndex.MEP_TOTAL]),
        },
      ],
    ];
  }),
);

function isoDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  const raw = String(value).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) return raw;
  const european = /^(\d{2})-(\d{2})-(\d{4})$/.exec(raw);
  if (european) return `${european[3]}-${european[2]}-${european[1]}`;
  return null;
}

function splitSources(value) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const parties = rows
  .slice(2)
  .filter((row) => text(valueAt(row, "ID")))
  .map((row) => {
    const country = text(valueAt(row, "COUNTRY"));
    const totals = legislatureTotals.get(country) ?? {};
    const formerLogos = [];
    for (let i = 1; i <= 5; i += 1) {
      const url = text(valueAt(row, `FORMER_LOGO${i}`));
      if (url) {
        formerLogos.push({
          url,
          until: isoDate(valueAt(row, `FORMER_LOGO${i}_UNTIL`)),
        });
      }
    }

    return {
      country,
      id: text(valueAt(row, "ID")),
      name: text(valueAt(row, "NAME")),
      nativeName: text(valueAt(row, "NATIVE_NAME")),
      acronym: text(valueAt(row, "ACRONYM")),
      seats: {
        lowerHouse: number(valueAt(row, "LOWER_HOUSE")),
        lowerHouseTotal: totals.lowerHouse ?? null,
        upperHouse: number(valueAt(row, "UPPER_HOUSE")),
        upperHouseTotal: totals.upperHouse ?? null,
        mep: number(valueAt(row, "MEP")),
        mepTotal: totals.mep ?? null,
      },
      logo: text(valueAt(row, "LOGO")),
      color: text(valueAt(row, "COLORCODE")) ?? "#666666",
      established: isoDate(valueAt(row, "ESTABLISHMENT")),
      dissolved: isoDate(valueAt(row, "DISSOLUTION")),
      labels: [1, 2, 3, 4, 5]
        .map((i) => text(valueAt(row, `LABEL${i}`)))
        .filter(Boolean),
      status: text(valueAt(row, "STATUS")),
      description: text(valueAt(row, "DESCRIPTION")),
      formerLogos,
      formerNames: text(valueAt(row, "FORMER_NAMES")),
      website: text(valueAt(row, "WEBSITE")),
      lastEdited: isoDate(valueAt(row, "LAST_EDITED")),
      sources: splitSources(valueAt(row, "SOURCES")),
    };
  })
  .sort((a, b) =>
    `${a.country ?? ""}\u0000${a.name ?? ""}`.localeCompare(
      `${b.country ?? ""}\u0000${b.name ?? ""}`,
      "en",
    ),
  );

const ids = new Set();
for (const party of parties) {
  if (!party.id || !party.name || !party.country) {
    throw new Error("Every party row must contain COUNTRY, ID and NAME.");
  }
  if (ids.has(party.id)) throw new Error(`Duplicate party ID: ${party.id}`);
  ids.add(party.id);
}

fs.writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      schemaVersion: 2,
      source: "data/PPDB database.xlsx",
      count: parties.length,
      parties,
    },
    null,
    2,
  )}\n`,
);

console.log(`Imported ${parties.length} parties from ${sheetName}.`);
