import { expect, test } from "vitest";

import {
  CompKey,
  Composition,
  Solids,
  SolidsBreakdown,
  Sugars,
  Sweeteners,
} from "../../dist/index";

function new_sugars_sucrose(amount: number): Sugars {
  const sugars = new Sugars();
  sugars.sucrose = amount;
  return sugars;
}

function new_sugars_unspecified(amount: number): Sugars {
  const sugars = new Sugars();
  sugars.unspecified = amount;
  return sugars;
}

test("Sugars.to_pod_js", () => {
  expect(new_sugars_sucrose(10).to_pod_js()).toBe(10);
  expect(new_sugars_unspecified(10).to_pod_js()).toBeUndefined();
});

test("Sugars.to_pac_js", () => {
  expect(new_sugars_sucrose(10).to_pac_js()).toBe(10);
  expect(new_sugars_unspecified(10).to_pac_js()).toBeUndefined();
});

test("Sweeteners.to_pod_js", () => {
  const sweeteners = new Sweeteners();

  sweeteners.sugars = new_sugars_sucrose(10);
  expect(sweeteners.sugars.to_pod_js()).toBe(10);
  expect(sweeteners.to_pod_js()).toBe(10);

  sweeteners.sugars = new_sugars_unspecified(10);
  expect(sweeteners.sugars.to_pod_js()).toBeUndefined();
  expect(sweeteners.to_pod_js()).toBeUndefined();
});

test("Sweeteners.to_pac_js", () => {
  const sweeteners = new Sweeteners();

  sweeteners.sugars = new_sugars_sucrose(10);
  expect(sweeteners.sugars.to_pac_js()).toBe(10);
  expect(sweeteners.to_pac_js()).toBe(10);

  sweeteners.sugars = new_sugars_unspecified(10);
  expect(sweeteners.sugars.to_pac_js()).toBeUndefined();
  expect(sweeteners.to_pac_js()).toBeUndefined();
});

test("Composition NaN values", () => {
  let composition = new Composition();

  expect(composition.water()).toBe(100);
  expect(composition.solids.total()).toBe(0);
  expect(composition.solids.fats()).toBe(0);
  expect(composition.emulsifiers_per_fat()).toBe(NaN);
  expect(composition.stabilizers_per_water()).toBe(0);
  expect(composition.absolute_pac()).toBe(0);
  expect(composition.get(CompKey.EmulsifiersPerFat)).toBe(NaN);

  composition = new Composition();
  const solids = new Solids();
  const breakdown = new SolidsBreakdown();
  breakdown.snfs = 100;
  solids.other = breakdown;
  composition.solids = solids;

  expect(composition.water()).toBe(0);
  expect(composition.solids.total()).toBe(100);
  expect(composition.stabilizers_per_water()).toBe(NaN);
  expect(composition.absolute_pac()).toBe(NaN);
  expect(composition.get(CompKey.StabilizersPerWater)).toBe(NaN);
  expect(composition.get(CompKey.AbsPAC)).toBe(NaN);
});
