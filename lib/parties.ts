import databaseJson from "../data/parties.json";
import type { RichTextRun } from "./rich-text";
export { dateSortKey, formatDate, formatLifeSpan } from "./party-dates";
export type { RichTextRun } from "./rich-text";

export type PartySeats = {
  legislature: number | null;
  legislatureName: string;
  legislatureTotal: number | null;
  lowerHouse: number | null;
  lowerHouseName: string;
  lowerHouseTotal: number | null;
  upperHouse: number | null;
  upperHouseName: string;
  upperHouseTotal: number | null;
  mep: number | null;
  mepTotal: number | null;
};

export type PartyLabel = {
  name: string;
  display: string;
  comment: string | null;
  indexVisible: boolean;
  runs: RichTextRun[];
};

export type PartyAlliance = {
  id: string;
  sourceId: string;
  name: string;
  display: string;
  comment: string | null;
  indexVisible: boolean;
  color: string;
  runs: RichTextRun[];
};

export type FormerLogo = {
  url: string;
  comment: string | null;
  until: string | null;
};

export type PartyFormatting = {
  country: RichTextRun[];
  name: RichTextRun[];
  nativeName: RichTextRun[];
  literalName: RichTextRun[];
  acronym: RichTextRun[];
  labels: RichTextRun[][];
  types: RichTextRun[][];
  status: RichTextRun[];
  relations: RichTextRun[];
  description: RichTextRun[];
  ideology: RichTextRun[];
  leadership: RichTextRun[];
  formerNames: RichTextRun[];
};

export type Party = {
  country: string;
  id: string;
  name: string;
  nativeName: string | null;
  literalName: string | null;
  acronym: string | null;
  seats: PartySeats;
  logo: string | null;
  color: string;
  established: string | null;
  registered: string | null;
  delegalised: string | null;
  dissolved: string | null;
  labels: string[];
  labelDetails: PartyLabel[];
  alliances: PartyAlliance[];
  types: string[];
  status: string | null;
  relations: string | null;
  description: string | null;
  ideology: string | null;
  leadership: string | null;
  formerLogos: FormerLogo[];
  formerNames: string | null;
  website: string | null;
  archivedWebsite: string | null;
  socials: {
    facebook: string | null;
    youtube: string | null;
    x: string | null;
    instagram: string | null;
    tiktok: string | null;
    telegram: string | null;
    vk: string | null;
  };
  lastEdited: string | null;
  sources: string[];
  formatting: PartyFormatting;
};

export type PartyRedirect = {
  id: string;
  targetId: string;
  color: string;
};

type PartyDatabase = {
  schemaVersion: number;
  source: string;
  count: number;
  redirects: PartyRedirect[];
  parties: Party[];
};

const database = databaseJson as unknown as PartyDatabase;

export const parties: Party[] = database.parties;
export const redirects: PartyRedirect[] = database.redirects;
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
