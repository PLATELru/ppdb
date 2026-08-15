import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import { parseFormerLogos } from "../lib/former-logos.mjs";

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

const hasMultilineFormerLogo = index.FORMER_LOGO != null;

function text(value) {
  const result = value == null ? "" : String(value).trim();
  return result || null;
}

function number(value) {
  if (value == null || value === "") return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function redirectColor(value, context) {
  const result = text(value);
  if (!result) return null;
  if (!/^#[0-9a-f]{6}$/i.test(result)) {
    throw new Error(`${context}: expected a six-digit hex colour such as #FF0000.`);
  }
  return result;
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

function splitRunsByLines(runs) {
  const lines = [[]];
  for (const run of runs) {
    const parts = run.text.split(/(\r\n|\n|\r)/);
    for (const part of parts) {
      if (!part) continue;
      if (/^(?:\r\n|\n|\r)$/.test(part)) {
        lines.push([]);
      } else {
        lines.at(-1).push({ ...run, text: part });
      }
    }
  }
  return lines.map(mergeRuns).filter((line) => line.length);
}

function sliceRuns(runs, start, end) {
  const result = [];
  let cursor = 0;
  for (const run of runs) {
    const runEnd = cursor + run.text.length;
    const sliceStart = Math.max(start, cursor);
    const sliceEnd = Math.min(end, runEnd);
    if (sliceStart < sliceEnd) {
      result.push({
        ...run,
        text: run.text.slice(sliceStart - cursor, sliceEnd - cursor),
      });
    }
    cursor = runEnd;
  }
  return mergeRuns(result);
}

function formattedRuns(cell, styleId = 0) {
  const plainText = text(cell?.v);
  if (!plainText) return [];

  const baseFont = cellFont(styleId);
  const baseBold = Boolean(baseFont.bold);
  const baseItalic = Boolean(baseFont.italic);
  const xml = typeof cell.r === "string" ? cell.r : "";
  const namespace = "(?:[A-Za-z_][\\w.-]*:)?";
  const xmlRuns = [
    ...xml.matchAll(new RegExp(`<${namespace}r>([\\s\\S]*?)<\\/${namespace}r>`, "g")),
  ];

  if (!xmlRuns.length) {
    return [{ text: plainText, bold: baseBold, italic: baseItalic }];
  }

  return mergeRuns(
    xmlRuns.map((match) => {
      const runXml = match[1];
      const properties = new RegExp(`<${namespace}rPr>([\\s\\S]*?)<\\/${namespace}rPr>`).exec(runXml)?.[1] ?? "";
      const runText = [
        ...runXml.matchAll(new RegExp(`<${namespace}t(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${namespace}t>`, "g")),
      ]
        .map((item) => decodeXml(item[1]))
        .join("");
      return {
        text: runText,
        bold: baseBold || new RegExp(`<${namespace}b(?:\\s[^>]*)?\\s*\\/>`).test(properties),
        italic: baseItalic || new RegExp(`<${namespace}i(?:\\s[^>]*)?\\s*\\/>`).test(properties),
      };
    }),
  );
}

function cellAt(targetSheet, rowNumber, columnIndex) {
  if (columnIndex == null) return null;
  return targetSheet[XLSX.utils.encode_cell({ r: rowNumber - 1, c: columnIndex })] ?? null;
}

function runsAt(rowNumber, key) {
  if (index[key] == null) return [];
  const address = XLSX.utils.encode_cell({ r: rowNumber - 1, c: index[key] });
  return formattedRuns(cellAt(sheet, rowNumber, index[key]), partyStyleIds.get(address) ?? 0);
}

function lineItemsAt(rowNumber, key, fallback = []) {
  const runs = runsAt(rowNumber, key);
  const lines = splitRunsByLines(runs).map((lineRuns) => ({
    text: lineRuns.map((run) => run.text).join(""),
    runs: lineRuns,
  }));
  if (lines.length) return lines;
  return fallback.map((item) => ({
    text: item,
    runs: [{ text: item, bold: false, italic: false }],
  }));
}

function labelItemsAt(rowNumber) {
  return lineItemsAt(rowNumber, "LABELS").flatMap((item) => {
    const hashIndex = item.text.indexOf("#");
    const labelEnd = hashIndex < 0 ? item.text.length : hashIndex;
    const labelStart = item.text.slice(0, labelEnd).search(/\S/);
    if (labelStart < 0) return [];
    const label = item.text.slice(labelStart, labelEnd).trimEnd();
    if (!label) return [];
    const labelRuns = sliceRuns(item.runs, labelStart, labelStart + label.length);

    if (hashIndex < 0) {
      return [{
        name: label,
        display: label,
        comment: null,
        indexVisible: true,
        runs: labelRuns,
      }];
    }

    const rawComment = item.text.slice(hashIndex + 1);
    const commentOffset = rawComment.search(/\S/);
    const comment = commentOffset < 0 ? "" : rawComment.slice(commentOffset).trimEnd();
    const commentRuns = comment
      ? sliceRuns(
          item.runs,
          hashIndex + 1 + commentOffset,
          hashIndex + 1 + commentOffset + comment.length,
        )
      : [];
    const spacer = comment
      ? [{ text: " ", bold: false, italic: false }]
      : [];

    return [{
      name: label,
      display: comment ? `${label} ${comment}` : label,
      comment: comment || null,
      indexVisible: false,
      runs: mergeRuns([...labelRuns, ...spacer, ...commentRuns]),
    }];
  });
}

function allianceItemsAt(rowNumber) {
  return lineItemsAt(rowNumber, "ALLIANCES").flatMap((item, lineIndex) => {
    const hashIndex = item.text.indexOf("#");
    const linkText = item.text.slice(0, hashIndex < 0 ? item.text.length : hashIndex).trim();
    if (!linkText) return [];

    const link = /^\[\[([^|\]]+)(?:\|([^\]]+))?\]\]$/.exec(linkText);
    if (!link) {
      throw new Error(
        `ALLIANCES at spreadsheet row ${rowNumber}, line ${lineIndex + 1}: expected [[ID]] or [[ID|name]].`,
      );
    }

    const targetId = link[1].trim();
    const name = link[2]?.trim() || null;
    const comment = hashIndex < 0 ? null : item.text.slice(hashIndex + 1).trim() || null;

    return [{
      id: targetId,
      name,
      comment,
      indexVisible: hashIndex < 0,
    }];
  });
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

const redirectsSheet = workbook.Sheets.Redirects;
const redirectRows = redirectsSheet
  ? XLSX.utils.sheet_to_json(redirectsSheet, { header: 1, raw: true, defval: null })
  : [];
const redirectHeaders = (redirectRows[0] ?? []).map((value) => String(value ?? "").trim());
const redirectIndex = Object.fromEntries(
  redirectHeaders.map((header, column) => [header, column]),
);
const rawRedirects = redirectRows.slice(1).flatMap((row, rowOffset) => {
  const id = text(row[redirectIndex.ID]);
  const targetId = text(row[redirectIndex["Redirect to"]]);
  if (!id && !targetId) return [];
  const rowNumber = rowOffset + 2;
  if (!id || !targetId) {
    throw new Error(`Redirects row ${rowNumber} must contain both ID and Redirect to.`);
  }
  return [{
    id,
    targetId,
    color: redirectColor(
      row[redirectIndex["ID colorcode"]],
      `ID colorcode at Redirects row ${rowNumber} (${id})`,
    ),
  }];
});

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
    const id = text(valueAt(row, "ID"));
    const formerLogos = hasMultilineFormerLogo
      ? parseFormerLogos(
          valueAt(row, "FORMER_LOGO"),
          `FORMER_LOGO at spreadsheet row ${rowNumber}${id ? ` (${id})` : ""}`,
        )
      : Array.from({ length: 5 }, (_, offset) => offset + 1)
          .map((number) => {
            const url = text(valueAt(row, `FORMER_LOGO${number}`));
            return url
              ? {
                  url,
                  comment: null,
                  until: dateValue(
                    cellAt(sheet, rowNumber, index[`FORMER_LOGO${number}_UNTIL`]),
                  ),
                }
              : null;
          })
          .filter(Boolean);

    const labelItems = labelItemsAt(rowNumber);
    const allianceItems = allianceItemsAt(rowNumber);
    const typeItems = lineItemsAt(rowNumber, "TYPE", ["Party"]);

    return {
      country,
      id,
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
      registered: dateValue(cellAt(sheet, rowNumber, index.REGISTERED)),
      delegalised: dateValue(cellAt(sheet, rowNumber, index.DELEGALISED)),
      dissolved: dateValue(cellAt(sheet, rowNumber, index.DISSOLUTION)),
      labels: labelItems.map((item) => item.name),
      labelDetails: labelItems,
      alliances: allianceItems,
      types: typeItems.map((item) => item.text),
      status: text(valueAt(row, "STATUS")),
      relations: text(valueAt(row, "RELATIONS")),
      description: text(valueAt(row, "DESCRIPTION")),
      ideology: text(valueAt(row, "Ideology")) ?? text(valueAt(row, "IDEOLOGY")),
      leadership: text(valueAt(row, "LEADERSHIP")),
      formerLogos,
      formerNames: text(valueAt(row, "FORMER_NAMES")),
      website: text(valueAt(row, "WEBSITE")),
      archivedWebsite: text(valueAt(row, "ARCHIVED_WEBSITE")),
      socials: {
        facebook: text(valueAt(row, "FACEBOOK")),
        youtube: text(valueAt(row, "YOUTUBE")),
        x: text(valueAt(row, "XTWITTER")),
        instagram: text(valueAt(row, "INSTAGRAM")),
        tiktok: text(valueAt(row, "TIKTOK")),
        telegram: text(valueAt(row, "TELEGRAM")),
        vk: text(valueAt(row, "VK")),
      },
      lastEdited: dateValue(cellAt(sheet, rowNumber, index.LAST_EDITED)),
      sources: splitSources(valueAt(row, "SOURCES")),
      formatting: {
        country: runsAt(rowNumber, "COUNTRY"),
        name: runsAt(rowNumber, "NAME"),
        nativeName: runsAt(rowNumber, "NATIVE_NAME"),
        literalName: runsAt(rowNumber, "LITERAL_NAME"),
        acronym: runsAt(rowNumber, "ACRONYM"),
        labels: labelItems.map((item) => item.runs),
        types: typeItems.map((item) => item.runs),
        status: runsAt(rowNumber, "STATUS"),
        relations: runsAt(rowNumber, "RELATIONS"),
        description: runsAt(rowNumber, "DESCRIPTION"),
        ideology: runsAt(rowNumber, index.Ideology == null ? "IDEOLOGY" : "Ideology"),
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

const partyById = new Map(parties.map((party) => [party.id.toLowerCase(), party]));
const rawRedirectById = new Map();
for (const redirect of rawRedirects) {
  const key = redirect.id.toLowerCase();
  if (partyById.has(key)) {
    throw new Error(`Redirect ID conflicts with a party ID: ${redirect.id}`);
  }
  if (rawRedirectById.has(key)) {
    throw new Error(`Duplicate redirect ID: ${redirect.id}`);
  }
  rawRedirectById.set(key, redirect);
}

const resolvedRedirectById = new Map();
function resolveRedirect(id, stack = []) {
  const key = id.toLowerCase();
  const cached = resolvedRedirectById.get(key);
  if (cached) return cached;
  const redirect = rawRedirectById.get(key);
  if (!redirect) return null;
  if (stack.includes(key)) {
    const cycle = [...stack, key]
      .map((item) => rawRedirectById.get(item)?.id ?? item)
      .join(" → ");
    throw new Error(`Redirect cycle: ${cycle}`);
  }

  const directParty = partyById.get(redirect.targetId.toLowerCase());
  const nestedRedirect = directParty
    ? null
    : resolveRedirect(redirect.targetId, [...stack, key]);
  if (!directParty && !nestedRedirect) {
    throw new Error(`Redirect ${redirect.id} points to missing ID: ${redirect.targetId}`);
  }
  const targetParty = directParty ?? partyById.get(nestedRedirect.targetId.toLowerCase());
  const resolved = {
    id: redirect.id,
    targetId: targetParty.id,
    color: redirect.color ?? nestedRedirect?.color ?? targetParty.color ?? "#666666",
  };
  resolvedRedirectById.set(key, resolved);
  return resolved;
}

const redirects = rawRedirects.map((redirect) => resolveRedirect(redirect.id));
for (const party of parties) {
  party.alliances = party.alliances.map((alliance) => {
    const redirect = resolvedRedirectById.get(alliance.id.toLowerCase());
    const targetId = redirect?.targetId ?? alliance.id;
    const target = partyById.get(targetId.toLowerCase());
    const name = alliance.name ?? target?.acronym ?? target?.name ?? alliance.id;
    const display = alliance.comment ? `${name} ${alliance.comment}` : name;
    return {
      id: target?.id ?? targetId,
      sourceId: alliance.id,
      name,
      display,
      comment: alliance.comment,
      indexVisible: alliance.indexVisible,
      color: redirect?.color ?? target?.color ?? "#666666",
      runs: [{ text: display, bold: false, italic: false }],
    };
  });
}

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
      schemaVersion: 9,
      source: "data/PPDB database.xlsx",
      count: parties.length,
      redirects,
      parties,
    },
    null,
    2,
  )}\n`,
);

console.log(`Imported ${parties.length} parties from ${sheetName}.`);
