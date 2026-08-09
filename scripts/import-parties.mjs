import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const root = process.cwd();
const inputPath = path.join(root, "data", "PPDB database.xlsx");
const outputPath = path.join(root, "data", "parties.json");

const workbook = XLSX.readFile(inputPath, {
  bookFiles: true,
  cellDates: false,
  cellHTML: true,
  cellStyles: true,
});
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

function sheetStyleIds(workbookValue, targetSheetName) {
  const sheetIndex = workbookValue.SheetNames.indexOf(targetSheetName);
  if (sheetIndex < 0) return new Map();
  const file = workbookValue.files?.[`xl/worksheets/sheet${sheetIndex + 1}.xml`];
  if (!file?.content) return new Map();

  const xml = Buffer.from(file.content).toString("utf8");
  const result = new Map();
  for (const match of xml.matchAll(/<c\b([^>]*)>/g)) {
    const attributes = match[1];
    const address = /\br="([^"]+)"/.exec(attributes)?.[1];
    const styleId = Number(/\bs="([^"]+)"/.exec(attributes)?.[1] ?? 0);
    if (address) result.set(address, styleId);
  }
  return result;
}

const partyStyleIds = sheetStyleIds(workbook, sheetName);

function cellFont(styleId) {
  const cellStyle = workbook.Styles?.CellXf?.[styleId];
  const fontId = Number(cellStyle?.fontId ?? cellStyle?.fontid ?? 0);
  return workbook.Styles?.Fonts?.[fontId] ?? {};
}

function decodeXml(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function mergeRuns(runs) {
  const result = [];
  for (const run of runs) {
    if (!run.text) continue;
    const previous = result.at(-1);
    if (previous && previous.bold === run.bold && previous.italic === run.italic) {
      previous.text += run.text;
    } else {
      result.push(run);
    }
  }
  if (result.length) {
    result[0].text = result[0].text.replace(/^\s+/, "");
    result.at(-1).text = result.at(-1).text.replace(/\s+$/, "");
  }
  return result.filter((run) => run.text);
}

function formattedRuns(cell, styleId = 0) {
  const plainText = text(cell?.v);
  if (!plainText) return [];

  const baseFont = cellFont(styleId);
  const baseBold = Boolean(baseFont.bold);
  const baseItalic = Boolean(baseFont.italic);
  const xml = typeof cell.r === "string" ? cell.r : "";
  const xmlRuns = [...xml.matchAll(/<r>([\s\S]*?)<\/r>/g)];

  if (!xmlRuns.length) {
    return [{ text: plainText, bold: baseBold, italic: baseItalic }];
  }

  return mergeRuns(
    xmlRuns.map((match) => {
      const runXml = match[1];
      const properties = /<rPr>([\s\S]*?)<\/rPr>/.exec(runXml)?.[1] ?? "";
      const runText = [...runXml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
        .map((item) => decodeXml(item[1]))
        .join("");
      return {
        text: runText,
        bold: baseBold || /<b(?:\s[^>]*)?\s*\/>/.test(properties),
        italic: baseItalic || /<i(?:\s[^>]*)?\s*\/>/.test(properties),
      };
    }),
  );
}

function cellAt(targetSheet, rowNumber, columnIndex) {
  if (columnIndex == null) return null;
  return targetSheet[XLSX.utils.encode_cell({ r: rowNumber - 1, c: columnIndex })] ?? null;
}

function runsAt(rowNumber, key) {
  const address = XLSX.utils.encode_cell({ r: rowNumber - 1, c: index[key] });
  return formattedRuns(cellAt(sheet, rowNumber, index[key]), partyStyleIds.get(address) ?? 0);
}

function dateValue(cell) {
  if (!cell || cell.v == null || cell.v === "") return null;

  if (typeof cell.v === "number") {
    const displayed = String(cell.w ?? "").trim();
    if (/^\d{4}$/.test(displayed) && cell.v >= 1000 && cell.v <= 9999) return displayed;

    const parsed = XLSX.SSF.parse_date_code(cell.v);
    if (!parsed) return null;
    const format = String(cell.z ?? "").toLowerCase().replace(/"[^"]*"/g, "");
    const hasYear = /y/.test(format);
    const hasMonth = /m/.test(format);
    const hasDay = /d/.test(format);
    const year = String(parsed.y).padStart(4, "0");
    const month = String(parsed.m).padStart(2, "0");
    const day = String(parsed.d).padStart(2, "0");
    if (hasYear && !hasMonth && !hasDay) return year;
    if (hasYear && hasMonth && !hasDay) return `${year}-${month}`;
    return `${year}-${month}-${day}`;
  }

  const raw = String(cell.v).trim();
  const yearOnly = /^(\d{4})$/.exec(raw);
  if (yearOnly) return yearOnly[1];
  const monthYear = /^(\d{1,2})-(\d{4})$/.exec(raw);
  if (monthYear) return `${monthYear[2]}-${monthYear[1].padStart(2, "0")}`;
  const isoMonth = /^(\d{4})-(\d{2})$/.exec(raw);
  if (isoMonth) return raw;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) return raw;
  const european = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(raw);
  if (european) {
    return `${european[3]}-${european[2].padStart(2, "0")}-${european[1].padStart(2, "0")}`;
  }
  return null;
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
const legislatureData = new Map(
  legislatureRows.slice(2).flatMap((row) => {
    const country = text(row[legislatureIndex.COUNTRY]);
    if (!country) return [];
    return [
      [
        country,
        {
          legislatureName: text(row[legislatureIndex.LEGISLATURE_NAME]),
          legislatureTotal: number(row[legislatureIndex.LEGISLATURE_TOTAL]),
          lowerHouseName: text(row[legislatureIndex.LOWER_HOUSE_NAME]),
          lowerHouseTotal: number(row[legislatureIndex.LOWER_HOUSE_TOTAL]),
          upperHouseName: text(row[legislatureIndex.UPPER_HOUSE_NAME]),
          upperHouseTotal: number(row[legislatureIndex.UPPER_HOUSE_TOTAL]),
          mepTotal: number(row[legislatureIndex.MEP_TOTAL]),
        },
      ],
    ];
  }),
);

function splitSources(value) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const parties = rows
  .slice(2)
  .map((row, rowOffset) => ({ row, rowNumber: rowOffset + 3 }))
  .filter(({ row }) => text(valueAt(row, "ID")))
  .map(({ row, rowNumber }) => {
    const country = text(valueAt(row, "COUNTRY"));
    const legislature = legislatureData.get(country) ?? {};
    const formerLogos = [];
    for (let i = 1; i <= 5; i += 1) {
      const url = text(valueAt(row, `FORMER_LOGO${i}`));
      if (url) {
        formerLogos.push({
          url,
          until: dateValue(cellAt(sheet, rowNumber, index[`FORMER_LOGO${i}_UNTIL`])),
        });
      }
    }

    const labelRuns = [1, 2, 3, 4, 5]
      .map((i) => ({ text: text(valueAt(row, `LABEL${i}`)), runs: runsAt(rowNumber, `LABEL${i}`) }))
      .filter((item) => item.text);

    return {
      country,
      id: text(valueAt(row, "ID")),
      name: text(valueAt(row, "NAME")),
      nativeName: text(valueAt(row, "NATIVE_NAME")),
      literalName: text(valueAt(row, "LITERAL_NAME")),
      acronym: text(valueAt(row, "ACRONYM")),
      seats: {
        legislature: number(valueAt(row, "LEGISLATURE")),
        legislatureName: legislature.legislatureName ?? "Legislature",
        legislatureTotal: legislature.legislatureTotal ?? null,
        lowerHouse: number(valueAt(row, "LOWER_HOUSE")),
        lowerHouseName: legislature.lowerHouseName ?? "Lower house",
        lowerHouseTotal: legislature.lowerHouseTotal ?? null,
        upperHouse: number(valueAt(row, "UPPER_HOUSE")),
        upperHouseName: legislature.upperHouseName ?? "Upper house",
        upperHouseTotal: legislature.upperHouseTotal ?? null,
        mep: number(valueAt(row, "MEP")),
        mepTotal: legislature.mepTotal ?? null,
      },
      logo: text(valueAt(row, "LOGO")),
      color: text(valueAt(row, "COLORCODE")) ?? "#666666",
      established: dateValue(cellAt(sheet, rowNumber, index.ESTABLISHMENT)),
      dissolved: dateValue(cellAt(sheet, rowNumber, index.DISSOLUTION)),
      labels: labelRuns.map((item) => item.text),
      status: text(valueAt(row, "STATUS")),
      description: text(valueAt(row, "DESCRIPTION")),
      leadership: text(valueAt(row, "LEADERSHIP")),
      formerLogos,
      formerNames: text(valueAt(row, "FORMER_NAMES")),
      website: text(valueAt(row, "WEBSITE")),
      lastEdited: dateValue(cellAt(sheet, rowNumber, index.LAST_EDITED)),
      sources: splitSources(valueAt(row, "SOURCES")),
      formatting: {
        country: runsAt(rowNumber, "COUNTRY"),
        name: runsAt(rowNumber, "NAME"),
        nativeName: runsAt(rowNumber, "NATIVE_NAME"),
        literalName: runsAt(rowNumber, "LITERAL_NAME"),
        acronym: runsAt(rowNumber, "ACRONYM"),
        labels: labelRuns.map((item) => item.runs),
        status: runsAt(rowNumber, "STATUS"),
        description: runsAt(rowNumber, "DESCRIPTION"),
        leadership: runsAt(rowNumber, "LEADERSHIP"),
        formerNames: runsAt(rowNumber, "FORMER_NAMES"),
      },
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
      schemaVersion: 3,
      source: "data/PPDB database.xlsx",
      count: parties.length,
      parties,
    },
    null,
    2,
  )}\n`,
);

console.log(`Imported ${parties.length} parties from ${sheetName}.`);
