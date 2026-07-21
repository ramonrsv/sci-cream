import { describe, it, expect } from "vitest";

import { CompKey, RatioKey, compToPropKey, ratioToPropKey } from "@workspace/sci-cream";

import {
  groupEnabledCompKeys,
  makeAutoHeuristicFunction,
  DEFAULT_SELECTED_PROPERTIES,
  UNCONDITIONAL_AUTO_PROPERTIES,
} from "./sci-cream";

import { makeMockRecipe } from "@/__tests__/unit/util";
import { RecipeID } from "@/__tests__/assets";
import { makeEmptyRecipe } from "@/lib/recipe/recipe";

// ---------------------------------------------------------------------------
// groupEnabledCompKeys
// ---------------------------------------------------------------------------

describe("groupEnabledCompKeys", () => {
  it("returns CompKeys and preserves the input key set (no duplicates)", () => {
    const input = [CompKey.MilkFat, CompKey.TotalFats, CompKey.MSNF];
    const ordered = groupEnabledCompKeys(input);

    // Every result key is one of the inputs, and the set is preserved exactly.
    for (const { key } of ordered) expect(input).toContain(key);
    expect(new Set(ordered.map((row) => row.key))).toEqual(new Set(input));
    expect(ordered).toHaveLength(input.length);
  });

  it("orders a roll-up before its enabled parts and marks it as a roll-up", () => {
    const ordered = groupEnabledCompKeys([CompKey.MilkFat, CompKey.MilkSolids]);

    const rollupIdx = ordered.findIndex((row) => row.key === CompKey.MilkSolids);
    const partIdx = ordered.findIndex((row) => row.key === CompKey.MilkFat);

    expect(rollupIdx).toBeGreaterThanOrEqual(0);
    expect(partIdx).toBeGreaterThan(rollupIdx);
    expect(ordered[rollupIdx].isRollup).toBe(true);
    expect(ordered[partIdx].isRollup).toBe(false);
    expect(ordered[partIdx].depth).toBe(ordered[rollupIdx].depth + 1);
  });
});

// ---------------------------------------------------------------------------
// makeAutoHeuristicFunction
// ---------------------------------------------------------------------------

describe("makeAutoHeuristicFunction", () => {
  const MILK_FAT = compToPropKey(CompKey.MilkFat); // default key, active in every test recipe
  const NUT_SNF = compToPropKey(CompKey.NutSNF); // default key, inactive (no nuts in the recipes)
  const STAB_PER_WATER = ratioToPropKey(RatioKey.StabilizersPerWater); // default ratio key
  const EMULS_PER_FAT = ratioToPropKey(RatioKey.EmulsifiersPerFat); // default ratio key
  const WATER = compToPropKey(CompKey.Water); // active, but not a default key
  const ABS_PAC = ratioToPropKey(RatioKey.AbsPAC); // not a default key (default has AbsNetPAC)

  it("fixtures encode the default-set membership the cases below rely on", () => {
    expect(DEFAULT_SELECTED_PROPERTIES.has(MILK_FAT)).toBe(true);
    expect(DEFAULT_SELECTED_PROPERTIES.has(NUT_SNF)).toBe(true);
    expect(DEFAULT_SELECTED_PROPERTIES.has(STAB_PER_WATER)).toBe(true);
    expect(DEFAULT_SELECTED_PROPERTIES.has(EMULS_PER_FAT)).toBe(true);
    expect(DEFAULT_SELECTED_PROPERTIES.has(WATER)).toBe(false);
    expect(DEFAULT_SELECTED_PROPERTIES.has(ABS_PAC)).toBe(false);
  });

  it("returns false for keys outside DEFAULT_SELECTED_PROPERTIES even when active", () => {
    const heuristic = makeAutoHeuristicFunction(makeMockRecipe(RecipeID.Main), []);
    expect(heuristic(WATER)).toBe(false);
    expect(heuristic(ABS_PAC)).toBe(false);
  });

  it("includes a default comp key active in a main-recipe ingredient", () => {
    const heuristic = makeAutoHeuristicFunction(makeMockRecipe(RecipeID.Main), []);
    expect(heuristic(MILK_FAT)).toBe(true);
  });

  it("includes a default ratio key when both of its part keys are active", () => {
    const heuristic = makeAutoHeuristicFunction(makeMockRecipe(RecipeID.Main), []);
    // Stab./Water's parts come from different ingredients in the main recipe, both active
    expect(heuristic(STAB_PER_WATER)).toBe(true);
    // "Egg Yolk" has both emulsifiers and fat
    expect(heuristic(EMULS_PER_FAT)).toBe(true);
  });

  it("excludes a default ratio key when one of its part keys is inactive", () => {
    // Drop the only stabilizer source: water stays active, but the stabilizer num goes to zero
    const noStabilizer = makeMockRecipe(RecipeID.Main);
    noStabilizer.ingredientRows = noStabilizer.ingredientRows.filter(
      (row) => row.name !== "Stabilizer Blend",
    );
    const heuristic = makeAutoHeuristicFunction(noStabilizer, []);
    expect(heuristic(STAB_PER_WATER)).toBe(false);

    // Drop the only emulsifier source: fat stays active, but the emulsifier num goes to zero
    const noEmulsifier = makeMockRecipe(RecipeID.Main);
    noEmulsifier.ingredientRows = noEmulsifier.ingredientRows.filter(
      (row) => row.name !== "Egg Yolk",
    );
    const heuristic2 = makeAutoHeuristicFunction(noEmulsifier, []);
    expect(heuristic2(EMULS_PER_FAT)).toBe(false);
  });

  it("excludes a default ratio key if both its part keys are inactive", () => {
    const emptyMain = makeEmptyRecipe(0);
    const heuristic = makeAutoHeuristicFunction(emptyMain, []);
    expect(heuristic(STAB_PER_WATER)).toBe(false);
    expect(heuristic(EMULS_PER_FAT)).toBe(false);
  });

  it("treats empty reference slots as inactive (zero/NaN ref values are not active)", () => {
    const heuristic = makeAutoHeuristicFunction(makeEmptyRecipe(0), [
      makeEmptyRecipe(1),
      makeEmptyRecipe(2),
    ]);
    expect(heuristic(STAB_PER_WATER)).toBe(false);
    expect(heuristic(EMULS_PER_FAT)).toBe(false);
    expect(heuristic(MILK_FAT)).toBe(false);
  });

  it("excludes a default key that is inactive across the main recipe and refs", () => {
    const heuristic = makeAutoHeuristicFunction(makeMockRecipe(RecipeID.Main), []);
    expect(heuristic(NUT_SNF)).toBe(false);
  });

  it("includes a default key active only in a reference recipe", () => {
    const emptyMain = makeEmptyRecipe(0);
    expect(makeAutoHeuristicFunction(emptyMain, [])(MILK_FAT)).toBe(false);
    expect(makeAutoHeuristicFunction(emptyMain, [makeMockRecipe(RecipeID.RefA)])(MILK_FAT)).toBe(
      true,
    );
  });

  it("includes UNCONDITIONAL_AUTO_PROPERTIES keys for an empty main and no refs", () => {
    const heuristic = makeAutoHeuristicFunction(makeEmptyRecipe(0), []);
    for (const key of UNCONDITIONAL_AUTO_PROPERTIES) {
      expect(heuristic(key)).toBe(true);
    }
  });
});
