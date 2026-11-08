import type { CountryDirectoryEntry } from "./country-directory";

export type CountrySortKey = "name" | "coverage" | "partyCount" | "lastRevision" | "seats";
export type CountrySortDirection = "asc" | "desc";

function coverageRank(coverage: string | null) {
  if (!coverage) return null;
  const value = coverage.toLowerCase();
  if (value.startsWith("almost all")) return 7;
  if (value.startsWith("majority")) return 6;
  if (value.startsWith("mostly parliamentary")) return 5;
  if (value === "parliamentary") return 4;
  if (value.startsWith("last election")) return 3;
  if (value === "only a few") return 2;
  return 1;
}

export function sortCountries(
  countries: readonly CountryDirectoryEntry[],
  key: CountrySortKey,
  direction: CountrySortDirection,
): CountryDirectoryEntry[] {
  const value = (country: CountryDirectoryEntry) => {
    switch (key) {
      case "coverage": return coverageRank(country.coverage);
      case "partyCount": return country.partyCount;
      case "lastRevision": return country.lastRevision;
      case "seats": return country.biggestParties[0]?.seats ?? null;
      default: return country.name;
    }
  };

  return [...countries].sort((a, b) => {
    const first = value(a);
    const second = value(b);
    // Missing coverage, dates and seat data stay last in either direction.
    if (first == null || second == null) {
      if (first != null) return -1;
      if (second != null) return 1;
    }
    const compared = typeof first === "number" && typeof second === "number"
      ? first - second
      : String(first ?? "").localeCompare(String(second ?? ""), "en");
    return compared * (direction === "asc" ? 1 : -1)
      || a.name.localeCompare(b.name, "en");
  });
}
