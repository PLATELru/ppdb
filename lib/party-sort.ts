export const SEAT_SORT_FIELDS = ["legislature", "lowerHouse", "upperHouse", "mep"] as const;

type SeatSortField = (typeof SEAT_SORT_FIELDS)[number];

export type SeatSortableParty = {
  dissolved: string | null;
  name: string;
  seats: Record<SeatSortField, number | null>;
};

export function comparePartiesBySeats(a: SeatSortableParty, b: SeatSortableParty) {
  const aDissolved = Boolean(a.dissolved);
  const bDissolved = Boolean(b.dissolved);

  if (aDissolved !== bDissolved) return aDissolved ? 1 : -1;
  if (aDissolved) return a.name.localeCompare(b.name, "en");

  const aPriority = SEAT_SORT_FIELDS.findIndex((field) => (a.seats[field] ?? 0) > 0);
  const bPriority = SEAT_SORT_FIELDS.findIndex((field) => (b.seats[field] ?? 0) > 0);

  if (aPriority !== bPriority) {
    if (aPriority < 0) return 1;
    if (bPriority < 0) return -1;
    return aPriority - bPriority;
  }
  if (aPriority < 0) return a.name.localeCompare(b.name, "en");

  for (let index = aPriority; index < SEAT_SORT_FIELDS.length; index += 1) {
    const field = SEAT_SORT_FIELDS[index];
    const seatDifference = (b.seats[field] ?? 0) - (a.seats[field] ?? 0);
    if (seatDifference) return seatDifference;
  }

  return a.name.localeCompare(b.name, "en");
}
