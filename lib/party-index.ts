import type { Party } from "./parties";

type PartyFormatting = Pick<
  Party["formatting"],
  "country" | "name" | "nativeName" | "literalName" | "acronym" | "types" | "status"
>;

export type PartyIndexEntry = Pick<
  Party,
  | "id"
  | "country"
  | "name"
  | "nativeName"
  | "literalName"
  | "acronym"
  | "formerNames"
  | "types"
  | "status"
  | "established"
  | "dissolved"
  | "seats"
  | "color"
  | "logo"
> & {
  labelDetails: Array<
    Pick<Party["labelDetails"][number], "name" | "display" | "runs" | "indexVisible">
  >;
  alliances: Array<
    Pick<Party["alliances"][number], "id" | "display" | "runs" | "color" | "indexVisible">
  >;
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
