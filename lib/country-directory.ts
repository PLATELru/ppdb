import type { Party } from "./parties";

export type Country = {
  name: string;
  coverage: string | null;
  lastRevision: string | null;
  type: string | null;
};

type CountryParty = Pick<Party, "id" | "name" | "acronym" | "color" | "countries" | "country" | "types" | "dissolved" | "seats">;

export type BiggestParty = {
  id: string;
  name: string;
  acronym: string | null;
  color: string;
  seats: number;
  chamber: string;
  total: number | null;
  houses: {
    lower: { seats: number | null; name: string; total: number | null };
    upper: { seats: number | null; name: string; total: number | null };
  } | null;
};

export type CountryDirectoryEntry = Country & {
  partyCount: number;
  biggestParties: BiggestParty[];
};

function nationalSeats(party: CountryParty, upperHouse: boolean) {
  if (upperHouse) {
    return {
      seats: party.seats.upperHouse ?? 0,
      chamber: party.seats.upperHouseName,
      total: party.seats.upperHouseTotal,
    };
  }
  const unicameral = (party.seats.legislature ?? 0) >= (party.seats.lowerHouse ?? 0);
  return {
    seats: Math.max(party.seats.legislature ?? 0, party.seats.lowerHouse ?? 0),
    chamber: unicameral ? party.seats.legislatureName : party.seats.lowerHouseName,
    total: unicameral ? party.seats.legislatureTotal : party.seats.lowerHouseTotal,
  };
}

export function getCountryDirectory(
  countries: readonly Country[],
  parties: readonly CountryParty[],
): CountryDirectoryEntry[] {
  const partiesByCountry = new Map<string, CountryParty[]>();
  for (const party of parties) {
    // Count a record once in each country, matching the Index country filter.
    for (const name of new Set(party.countries)) {
      const records = partiesByCountry.get(name) ?? [];
      records.push(party);
      partiesByCountry.set(name, records);
    }
  }

  return [...countries].sort((a, b) => a.name.localeCompare(b.name, "en")).map((country) => {
    const records = partiesByCountry.get(country.name) ?? [];
    const candidates = records.filter((party) => (
      !party.dissolved
      && party.types.includes("Party")
      // Seat figures belong to the first country in a multinational record.
      && party.country === country.name
    ));
    const upperHouse = !candidates.some((party) => nationalSeats(party, false).seats > 0);
    const bicameral = candidates.some(({ seats }) => (
      seats.lowerHouse != null || seats.upperHouse != null
      || seats.lowerHouseTotal != null || seats.upperHouseTotal != null
    ));
    const ranked = candidates.map((party) => ({
      id: party.id,
      name: party.name,
      acronym: party.acronym,
      color: party.color,
      ...nationalSeats(party, upperHouse),
      houses: bicameral ? {
        lower: {
          seats: party.seats.lowerHouse,
          name: party.seats.lowerHouseName,
          total: party.seats.lowerHouseTotal,
        },
        upper: {
          seats: party.seats.upperHouse,
          name: party.seats.upperHouseName,
          total: party.seats.upperHouseTotal,
        },
      } : null,
    }));
    const largest = Math.max(0, ...ranked.map((party) => party.seats));

    return {
      ...country,
      partyCount: records.length,
      biggestParties: largest > 0
        ? ranked.filter((party) => party.seats === largest).sort((a, b) => a.name.localeCompare(b.name, "en"))
        : [],
    };
  });
}
