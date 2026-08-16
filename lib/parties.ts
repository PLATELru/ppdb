import database from "../data/parties.json";
export { dateSortKey, formatDate, formatLifeSpan } from "./party-dates";
export type { RichTextRun } from "./rich-text";

export type Party = (typeof database.parties)[number];

export const parties = database.parties;
export const redirects = database.redirects;
const partyById = new Map(parties.map((party) => [party.id.toLowerCase(), party]));
const redirectById = new Map(redirects.map((redirect) => [redirect.id.toLowerCase(), redirect]));
export const countries = Array.from(
  new Set(parties.map((party) => party.country).filter(Boolean)),
).sort((a, b) => a.localeCompare(b, "en"));

export function getParty(id: string) {
  return partyById.get(id.toLowerCase());
}

export function resolvePartyLink(id: string) {
  const redirect = redirectById.get(id.toLowerCase());
  const targetId = redirect?.targetId ?? id;
  const party = getParty(targetId);
  return {
    party,
    targetId: party?.id ?? targetId,
    redirect,
  };
}
