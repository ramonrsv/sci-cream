import { describe, it, expect } from "vitest";

import {
  CompKey,
  RatioKey,
  FpdKey,
  PropKey,
  compToPropKey,
  ratioToPropKey,
  fpdToPropKey,
} from "@workspace/sci-cream";

import { isPropKeyQuantity, isPropKeyMixScope, getAcceptablePropertyRange } from "./sci-cream";

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

  it("returns false for PropKeys derived from RatioKeys and FpdKeys", () => {
    const nonQtyPropKeys: PropKey[] = [
      ratioToPropKey(RatioKey.AbsPAC),
      ratioToPropKey(RatioKey.EmulsifiersPerFat),
      ratioToPropKey(RatioKey.StabilizersPerWater),
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
// isPropKeyMixScope
// ---------------------------------------------------------------------------

describe("isPropKeyMixScope", () => {
  it("returns true for non-ratio keys", () => {
    expect(isPropKeyMixScope(compToPropKey(CompKey.MilkFat))).toBe(true);
    expect(isPropKeyMixScope(fpdToPropKey(FpdKey.FPD))).toBe(true);
  });

  it("returns true for the current (mix-scoped) ratio keys", () => {
    // The current ratio keys are all mix-scoped, so none are filtered from the mix composition
    expect(isPropKeyMixScope(ratioToPropKey(RatioKey.AbsPAC))).toBe(true);
    expect(isPropKeyMixScope(ratioToPropKey(RatioKey.EmulsifiersPerFat))).toBe(true);
    expect(isPropKeyMixScope(ratioToPropKey(RatioKey.StabilizersPerWater))).toBe(true);
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
