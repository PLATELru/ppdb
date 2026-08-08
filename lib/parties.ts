import database from "../data/parties.json";

export type Party = (typeof database.parties)[number];

export const parties = database.parties;
export const countries = Array.from(
  new Set(parties.map((party) => party.country).filter(Boolean)),
).sort((a, b) => a.localeCompare(b, "en"));

export function getParty(id: string) {
  return parties.find((party) => party.id.toLowerCase() === id.toLowerCase());
}

export function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
