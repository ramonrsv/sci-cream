import { expect, test } from "vitest";

import { CompKey, Composition, Solids, SolidsBreakdown, Sugars } from "../../dist/index";

function new_sugars_sucrose(amount: number): Sugars {
  const sugars = new Sugars();
  sugars.sucrose = amount;
  return sugars;
}

function new_sugars_other(amount: number): Sugars {
  const sugars = new Sugars();
  sugars.other = amount;
  return sugars;
}

test("Sugars.to_pod", () => {
  expect(new_sugars_sucrose(10).to_pod()).toBe(10);
  expect(() => new_sugars_other(10).to_pod()).toThrowError();
});

test("Sugars.to_pac", () => {
  expect(new_sugars_sucrose(10).to_pac()).toBe(10);
  expect(() => new_sugars_other(10).to_pac()).toThrowError();
});

test("Composition NaN values", () => {
  const composition = new Composition();

  expect(composition.get(CompKey.TotalSolids)).toBe(0);
  expect(composition.get(CompKey.Water)).toBe(100);
  expect(composition.get(CompKey.TotalFats)).toBe(0);
  expect(composition.get(CompKey.EmulsifiersPerFat)).toBe(NaN);
  expect(composition.get(CompKey.StabilizersPerWater)).toBe(0);
  expect(composition.get(CompKey.AbsPAC)).toBe(0);

  const solids = new Solids();
  const breakdown = new SolidsBreakdown();
  breakdown.others = 100;
  solids.other = breakdown;
  composition.solids = solids;

  expect(composition.get(CompKey.TotalSolids)).toBe(100);
  expect(composition.get(CompKey.Water)).toBe(0);
  expect(composition.get(CompKey.TotalFats)).toBe(0);
  expect(composition.get(CompKey.EmulsifiersPerFat)).toBe(NaN);
  expect(composition.get(CompKey.StabilizersPerWater)).toBe(NaN);
  expect(composition.get(CompKey.AbsPAC)).toBe(NaN);
});
