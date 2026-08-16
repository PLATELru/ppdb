import assert from "node:assert/strict";
import test from "node:test";
import { comparePartiesBySeats, SEAT_SORT_GROUPS } from "../lib/party-sort.ts";

function party(name, seats = {}, dissolved = null) {
  return {
    dissolved,
    name,
    seats: {
      legislature: null,
      lowerHouse: null,
      upperHouse: null,
      mep: null,
      ...seats,
    },
  };
}

test("sorts represented, active and dissolved parties in the requested order", () => {
  const parties = [
    party("Dissolved with seats", { legislature: 500 }, "2020-01-01"),
    party("Active without seats"),
    party("MEPs", { mep: 20 }),
    party("Upper house", { upperHouse: 80 }),
    party("Lower house small", { lowerHouse: 10 }),
    party("Lower house large", { lowerHouse: 100 }),
    party("Unicameral small", { legislature: 1 }),
    party("Unicameral large", { legislature: 200 }),
  ];

  assert.deepEqual(SEAT_SORT_GROUPS, [
    ["legislature", "lowerHouse"],
    ["upperHouse"],
    ["mep"],
  ]);
  assert.deepEqual(parties.sort(comparePartiesBySeats).map(({ name }) => name), [
    "Unicameral large",
    "Lower house large",
    "Lower house small",
    "Unicameral small",
    "Upper house",
    "MEPs",
    "Active without seats",
    "Dissolved with seats",
  ]);
});

test("sorts dissolved parties from the most recent dissolution to the oldest", () => {
  const parties = [
    party("Oldest", {}, "1917-08-24"),
    party("Zulu same date", {}, "2000-01-01"),
    party("Most recent", {}, "2025-07-15"),
    party("Alpha same date", {}, "2000-01-01"),
    party("Middle", {}, "2012-04-06"),
  ];

  assert.deepEqual(parties.sort(comparePartiesBySeats).map(({ name }) => name), [
    "Most recent",
    "Middle",
    "Alpha same date",
    "Zulu same date",
    "Oldest",
  ]);
});

test("compares unicameral and lower-house seats in the same primary group", () => {
  const parties = [
    party("PAICV", { legislature: 29 }),
    party("United Russia", { lowerHouse: 315, upperHouse: 136 }),
  ];

  assert.deepEqual(parties.sort(comparePartiesBySeats).map(({ name }) => name), [
    "United Russia",
    "PAICV",
  ]);
});

test("uses later seat groups and then names to break ties", () => {
  const parties = [
    party("Zulu", { lowerHouse: 10, upperHouse: 2 }),
    party("Alpha", { lowerHouse: 10, upperHouse: 2 }),
    party("Beta", { lowerHouse: 10, upperHouse: 3 }),
  ];

  assert.deepEqual(parties.sort(comparePartiesBySeats).map(({ name }) => name), [
    "Beta",
    "Alpha",
    "Zulu",
  ]);
});
