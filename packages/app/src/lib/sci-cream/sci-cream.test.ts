import { describe, it, expect } from "vitest";

import { CompKey, FpdKey, PropKey, compToPropKey, fpdToPropKey } from "@workspace/sci-cream";

import { isCompKeyQuantity, isPropKeyQuantity, getAcceptablePropertyRange } from "./sci-cream";

// ---------------------------------------------------------------------------
// isCompKeyQuantity
// ---------------------------------------------------------------------------

describe("isCompKeyQuantity", () => {
  it("returns true for quantity CompKeys", () => {
    const qtyKeys: CompKey[] = [
      CompKey.TotalFats,
      CompKey.MilkFat,
      CompKey.Water,
      CompKey.TotalSolids,
    ];

    for (const key of qtyKeys) {
      expect(isCompKeyQuantity(key as CompKey)).toBe(true);
    }
  });

  it("returns false for ratio CompKeys", () => {
    const ratioKeys: CompKey[] = [
      CompKey.AbsPAC,
      CompKey.EmulsifiersPerFat,
      CompKey.StabilizersPerWater,
    ];

    for (const key of ratioKeys) {
      expect(isCompKeyQuantity(key as CompKey)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// isPropKeyQuantity
// ---------------------------------------------------------------------------

describe("isPropKeyQuantity", () => {
  it("returns true for PropKeys derived from quantity CompKeys", () => {
    const qtyPropKeys: PropKey[] = [
      compToPropKey(CompKey.TotalFats),
      compToPropKey(CompKey.MilkFat),
      compToPropKey(CompKey.Water),
      compToPropKey(CompKey.TotalSolids),
    ];

    for (const key of qtyPropKeys) {
      expect(isPropKeyQuantity(key as PropKey)).toBe(true);
    }
  });

  it("returns false for PropKeys derived from ratio CompKeys and FpdKeys", () => {
    const nonQtyPropKeys: PropKey[] = [
      compToPropKey(CompKey.AbsPAC),
      compToPropKey(CompKey.EmulsifiersPerFat),
      compToPropKey(CompKey.StabilizersPerWater),
      fpdToPropKey(FpdKey.FPD),
      fpdToPropKey(FpdKey.ServingTemp),
      fpdToPropKey(FpdKey.HardnessAt14C),
    ];

    for (const key of nonQtyPropKeys) {
      expect(isPropKeyQuantity(key as PropKey)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// getAcceptablePropertyRange
// ---------------------------------------------------------------------------

describe("getAcceptablePropertyRange", () => {
  it("returns the expected range for various property keys", () => {
    const testCases = [
      [compToPropKey(CompKey.MSNF), { min: 5, max: 15 }],
      [compToPropKey(CompKey.TotalSolids), { min: 30, max: 43 }],
      [fpdToPropKey(FpdKey.ServingTemp), { min: -18, max: -10 }],
    ];

    for (const [key, expected] of testCases) {
      expect(getAcceptablePropertyRange(key as PropKey)).toEqual(expected);
    }
  });

  it("returns undefined for keys without a defined range", () => {
    expect(getAcceptablePropertyRange(compToPropKey(CompKey.MilkFat))).toBeUndefined();
    expect(getAcceptablePropertyRange(compToPropKey(CompKey.Water))).toBeUndefined();
    expect(getAcceptablePropertyRange(fpdToPropKey(FpdKey.FPD))).toBeUndefined();
  });
});
