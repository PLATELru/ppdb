import database from "../data/parties.json";

export type Party = (typeof database.parties)[number];
export type RichTextRun = {
  text: string;
  bold: boolean;
  italic: boolean;
};

export const parties = database.parties;
export const countries = Array.from(
  new Set(parties.map((party) => party.country).filter(Boolean)),
).sort((a, b) => a.localeCompare(b, "en"));

export function getParty(id: string) {
  return parties.find((party) => party.id.toLowerCase() === id.toLowerCase());
}

export function formatDate(value: string | null) {
  if (!value) return null;
  if (/^\d{4}$/.test(value)) return value;

  const isMonthOnly = /^\d{4}-\d{2}$/.test(value);
  const normalized = isMonthOnly ? `${value}-01` : value;
  const date = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    ...(isMonthOnly ? {} : { day: "numeric" as const }),
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function dateSortKey(value: string | null) {
  if (!value) return "";
  if (/^\d{4}$/.test(value)) return `${value}-01-01`;
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`;
  return value;
}

export function formatLifeSpan(established: string | null, dissolved: string | null) {
  const startYear = established?.match(/^\d{4}/)?.[0] ?? null;
  const endYear = dissolved?.match(/^\d{4}/)?.[0] ?? null;
  if (!startYear || !endYear) return null;
  return `${startYear} – ${endYear}`;
}
