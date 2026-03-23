import { expect, test } from "vitest";

import {
  getTsEnumStrings,
  getTsEnumNumbers,
  tsEnumToStr,
  makeStrEnumFromTsEnum,
  getTsEnumNumberKeys,
  getTsEnumStringKeys,
  getWasmEnums,
} from "./util";

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

test("tsEnumToStr", () => {
  expect(tsEnumToStr(AlphaTs, "First")).toEqual("First");
  expect(tsEnumToStr(AlphaTs, "Second")).toEqual("Second");
  expect(tsEnumToStr(BetaTs, "First")).toEqual("First");
  expect(tsEnumToStr(BetaTs, "Second")).toEqual("Second");
});

const AlphaStrEnum = makeStrEnumFromTsEnum(AlphaTs);
const BetaStrEnum = makeStrEnumFromTsEnum(BetaTs);

test("makeStrEnumFromTsEnum", () => {
  expect(AlphaStrEnum).toEqual({ First: "First", Second: "Second" });
  expect(BetaStrEnum).toEqual({ First: "First", Second: "Second" });

  expect(Object.keys(AlphaStrEnum)).toEqual(["First", "Second"]);
  expect(Object.keys(BetaStrEnum)).toEqual(["First", "Second"]);
  expect(Object.values(AlphaStrEnum)).toEqual(["First", "Second"]);
  expect(Object.values(BetaStrEnum)).toEqual(["First", "Second"]);

  expect(AlphaStrEnum.First).toEqual("First");
  expect(AlphaStrEnum.Second).toEqual("Second");
  expect(BetaStrEnum.First).toEqual("First");
  expect(BetaStrEnum.Second).toEqual("Second");
});

test("getTsEnumNumberKeys", () => {
  expect(getTsEnumNumberKeys(AlphaTs)).toEqual([0, 1]);
  expect(getTsEnumNumberKeys(BetaTs)).toEqual([0, 1]);
});

test("getTsEnumStringKeys", () => {
  expect(getTsEnumStringKeys(AlphaTs)).toEqual(["First", "Second"]);
  expect(getTsEnumStringKeys(BetaTs)).toEqual(["First", "Second"]);
});

const GammaWasm = Object.freeze({
  First: 0,
  "0": "First",
  Second: 1,
  "1": "Second",
  Third: 2,
  "2": "Third",
});

test("getWasmEnums", () => {
  expect(getWasmEnums(AlphaTs)).toEqual([0, 1]);
  expect(getWasmEnums(BetaTs)).toEqual([0, 1]);
  expect(getWasmEnums(GammaWasm)).toEqual([0, 1, 2]);
});
