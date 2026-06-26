import { expect, test } from "vitest";

import { CompKey, FpdKey } from "../../wasm/index";

import { PropKey, compToPropKey, fpdToPropKey } from "./prop-key";
import { getAcceptablePropertyRange } from "./ranges";

test("getAcceptablePropertyRange returns the expected range for various property keys", () => {
  const testCases: [PropKey, { min: number; max: number }][] = [
    [compToPropKey(CompKey.MSNF), { min: 5, max: 15 }],
    [compToPropKey(CompKey.TotalSolids), { min: 30, max: 43 }],
    [fpdToPropKey(FpdKey.ServingTemp), { min: -18, max: -10 }],
  ];

  for (const [key, expected] of testCases) {
    expect(getAcceptablePropertyRange(key)).toEqual(expected);
  }
});

test("getAcceptablePropertyRange returns undefined for keys without a defined range", () => {
  expect(getAcceptablePropertyRange(compToPropKey(CompKey.MilkFat))).toBeUndefined();
  expect(getAcceptablePropertyRange(compToPropKey(CompKey.Water))).toBeUndefined();
  expect(getAcceptablePropertyRange(fpdToPropKey(FpdKey.FPD))).toBeUndefined();
});
