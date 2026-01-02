import { expect, test } from "vitest";

import {
  CompKey,
  Composition,
  Solids,
  SolidsBreakdown,
  compToPropKey,
  MixProperties,
  getMixProperty,
} from "../../dist/index";

test("MixProperties NaN values", () => {
  let mixProperties = new MixProperties();

  expect(getMixProperty(mixProperties, compToPropKey(CompKey.Water))).toBe(100);
  expect(getMixProperty(mixProperties, compToPropKey(CompKey.TotalSolids))).toBe(0);
  expect(getMixProperty(mixProperties, compToPropKey(CompKey.TotalFats))).toBe(0);
  expect(getMixProperty(mixProperties, compToPropKey(CompKey.EmulsifiersPerFat))).toBe(NaN);
  expect(getMixProperty(mixProperties, compToPropKey(CompKey.StabilizersPerWater))).toBe(0);
  expect(getMixProperty(mixProperties, compToPropKey(CompKey.AbsPAC))).toBe(0);

  mixProperties = new MixProperties();
  const composition = new Composition();
  const solids = new Solids();
  const breakdown = new SolidsBreakdown();
  breakdown.others = 100;
  solids.other = breakdown;
  composition.solids = solids;
  mixProperties.composition = composition;

  expect(getMixProperty(mixProperties, compToPropKey(CompKey.Water))).toBe(0);
  expect(getMixProperty(mixProperties, compToPropKey(CompKey.TotalSolids))).toBe(100);
  expect(getMixProperty(mixProperties, compToPropKey(CompKey.TotalFats))).toBe(0);
  expect(getMixProperty(mixProperties, compToPropKey(CompKey.EmulsifiersPerFat))).toBe(NaN);
  expect(getMixProperty(mixProperties, compToPropKey(CompKey.StabilizersPerWater))).toBe(NaN);
  expect(getMixProperty(mixProperties, compToPropKey(CompKey.AbsPAC))).toBe(NaN);
});
