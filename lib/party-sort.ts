export const SEAT_SORT_GROUPS = [
  ["legislature", "lowerHouse"],
  ["upperHouse"],
  ["mep"],
] as const;

type SeatSortField = (typeof SEAT_SORT_GROUPS)[number][number];

export type SeatSortableParty = {
  dissolved: string | null;
  name: string;
  seats: Record<SeatSortField, number | null>;
};

function seatSortValues(party: SeatSortableParty) {
  return SEAT_SORT_GROUPS.map((fields) =>
    Math.max(...fields.map((field) => party.seats[field] ?? 0)),
  );
}

export function comparePartiesBySeats(a: SeatSortableParty, b: SeatSortableParty) {
  const aDissolved = Boolean(a.dissolved);
  const bDissolved = Boolean(b.dissolved);

  if (aDissolved !== bDissolved) return aDissolved ? 1 : -1;
  if (aDissolved) return a.name.localeCompare(b.name, "en");

  const aSeats = seatSortValues(a);
  const bSeats = seatSortValues(b);
  const aPriority = aSeats.findIndex((value) => value > 0);
  const bPriority = bSeats.findIndex((value) => value > 0);

  if (aPriority !== bPriority) {
    if (aPriority < 0) return 1;
    if (bPriority < 0) return -1;
    return aPriority - bPriority;
  }
  if (aPriority < 0) return a.name.localeCompare(b.name, "en");

  for (let index = aPriority; index < SEAT_SORT_GROUPS.length; index += 1) {
    const seatDifference = bSeats[index] - aSeats[index];
    if (seatDifference) return seatDifference;
  }

  return a.name.localeCompare(b.name, "en");
}
