import type { Party } from "./parties";
import type { RichTextRun } from "./rich-text";

type PartyIndexSeats = {
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

type PartyFormatting = {
  country: RichTextRun[];
  name: RichTextRun[];
  nativeName: RichTextRun[];
  literalName: RichTextRun[];
  acronym: RichTextRun[];
  types: RichTextRun[][];
  status: RichTextRun[];
};

export type PartyIndexEntry = {
  id: string;
  country: string;
  name: string;
  nativeName: string | null;
  literalName: string | null;
  acronym: string | null;
  formerNames: string | null;
  types: string[];
  status: string | null;
  labelDetails: Array<{
    name: string;
    display: string;
    runs: RichTextRun[];
    indexVisible: boolean;
  }>;
  alliances: Array<{
    id: string;
    display: string;
    runs: RichTextRun[];
    color: string;
    indexVisible: boolean;
  }>;
  established: string | null;
  dissolved: string | null;
  seats: PartyIndexSeats;
  color: string;
  logo: string | null;
  formatting: PartyFormatting;
};

export type PartyIndexPayload = {
  count: number;
  parties: PartyIndexEntry[];
  schemaVersion: number;
};

export function getPartyIndexVersion(parties: readonly PartyIndexEntry[]) {
  const content = JSON.stringify(parties);
  let hash = 0x811c9dc5;

  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `${parties.length}-${(hash >>> 0).toString(36)}`;
}

export function getPartySearchText(party: PartyIndexEntry) {
  return [
    party.id,
    party.name,
    party.nativeName,
    party.literalName,
    party.acronym,
    party.country,
    ...party.types,
    party.status,
    party.formerNames,
    ...party.labelDetails.map((label) => label.display),
    ...party.alliances.map((alliance) => alliance.display),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function toPartyIndexEntry(party: Party): PartyIndexEntry {
  return {
    id: party.id,
    country: party.country,
    name: party.name,
    nativeName: party.nativeName,
    literalName: party.literalName,
    acronym: party.acronym,
    formerNames: party.formerNames,
    types: party.types,
    status: party.status,
    labelDetails: party.labelDetails.map(({ name, display, runs, indexVisible }) => ({
      name,
      display,
      runs,
      indexVisible,
    })),
    alliances: party.alliances.map(({ id, display, runs, color, indexVisible }) => ({
      id,
      display,
      runs,
      color,
      indexVisible,
    })),
    established: party.established,
    dissolved: party.dissolved,
    seats: party.seats,
    color: party.color,
    logo: party.logo,
    formatting: {
      country: party.formatting.country,
      name: party.formatting.name,
      nativeName: party.formatting.nativeName,
      literalName: party.formatting.literalName,
      acronym: party.formatting.acronym,
      types: party.formatting.types,
      status: party.formatting.status,
    },
  };
}
