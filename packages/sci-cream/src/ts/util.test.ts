import { expect, test } from "vitest";

import { getTsEnumStrings, getTsEnumNumbers, makeStrEnumFromTsEnum } from "./util";

enum AlphaTs {
  First,
  Second,
}

const BetaTs = Object.freeze({ First: 0, "0": "First", Second: 1, "1": "Second" });

test("getTsEnumNumbers", () => {
  expect(getTsEnumNumbers(AlphaTs)).toEqual([0, 1]);
  expect(getTsEnumNumbers(BetaTs)).toEqual([0, 1]);
});

test("getTsEnumStrings", () => {
  expect(getTsEnumStrings(AlphaTs)).toEqual(["First", "Second"]);
  expect(getTsEnumStrings(BetaTs)).toEqual(["First", "Second"]);
});

const AlphaStr = makeStrEnumFromTsEnum(AlphaTs);
const BetaStr = makeStrEnumFromTsEnum(BetaTs);

test("makeStrEnumFromTsEnum", () => {
  expect(AlphaStr).toEqual({ First: "First", Second: "Second" });
  expect(BetaStr).toEqual({ First: "First", Second: "Second" });

  expect(Object.keys(AlphaStr)).toEqual(["First", "Second"]);
  expect(Object.keys(BetaStr)).toEqual(["First", "Second"]);
  expect(Object.values(AlphaStr)).toEqual(["First", "Second"]);
  expect(Object.values(BetaStr)).toEqual(["First", "Second"]);

  expect(AlphaStr.First).toEqual("First");
  expect(AlphaStr.Second).toEqual("Second");
  expect(BetaStr.First).toEqual("First");
  expect(BetaStr.Second).toEqual("Second");
});
