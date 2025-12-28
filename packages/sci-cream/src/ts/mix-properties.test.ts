import { expect, test } from "vitest";

import {
  CompKey,
  Composition,
  Solids,
  SolidsBreakdown,
  PropKey,
  MixProperties,
  getMixProperty,
} from "../../dist/index";

test("MixProperties NaN values", () => {
  let mixProperties = new MixProperties();

  expect(getMixProperty(mixProperties, CompKey[CompKey.Water] as PropKey)).toBe(100);
  expect(getMixProperty(mixProperties, CompKey[CompKey.TotalSolids] as PropKey)).toBe(0);
  expect(getMixProperty(mixProperties, CompKey[CompKey.TotalFat] as PropKey)).toBe(0);
  expect(getMixProperty(mixProperties, CompKey[CompKey.EmulsifiersPerFat] as PropKey)).toBe(NaN);
  expect(getMixProperty(mixProperties, CompKey[CompKey.StabilizersPerWater] as PropKey)).toBe(0);
  expect(getMixProperty(mixProperties, CompKey[CompKey.AbsPAC] as PropKey)).toBe(0);

  mixProperties = new MixProperties();
  const composition = new Composition();
  const solids = new Solids();
  const breakdown = new SolidsBreakdown();
  breakdown.snfs = 100;
  solids.other = breakdown;
  composition.solids = solids;
  mixProperties.composition = composition;

  expect(getMixProperty(mixProperties, CompKey[CompKey.Water] as PropKey)).toBe(0);
  expect(getMixProperty(mixProperties, CompKey[CompKey.TotalSolids] as PropKey)).toBe(100);
  expect(getMixProperty(mixProperties, CompKey[CompKey.EmulsifiersPerFat] as PropKey)).toBe(NaN);
  expect(getMixProperty(mixProperties, CompKey[CompKey.StabilizersPerWater] as PropKey)).toBe(NaN);
  expect(getMixProperty(mixProperties, CompKey[CompKey.AbsPAC] as PropKey)).toBe(NaN);
});
