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

test("Sugars.to_pod_wasm", () => {
  expect(new_sugars_sucrose(10).to_pod_wasm()).toBe(10);
  expect(() => new_sugars_unspecified(10).to_pod_wasm()).toThrowError();
});

test("Sugars.to_pac_wasm", () => {
  expect(new_sugars_sucrose(10).to_pac_wasm()).toBe(10);
  expect(() => new_sugars_unspecified(10).to_pac_wasm()).toThrowError();
});

test("Sweeteners.to_pod_wasm", () => {
  const sweeteners = new Sweeteners();

  sweeteners.sugars = new_sugars_sucrose(10);
  expect(sweeteners.sugars.to_pod_wasm()).toBe(10);
  expect(sweeteners.to_pod_wasm()).toBe(10);

  sweeteners.sugars = new_sugars_unspecified(10);
  expect(() => sweeteners.sugars.to_pod_wasm()).toThrowError();
  expect(() => sweeteners.to_pod_wasm()).toThrowError();
});

test("Sweeteners.to_pac_wasm", () => {
  const sweeteners = new Sweeteners();

  sweeteners.sugars = new_sugars_sucrose(10);
  expect(sweeteners.sugars.to_pac_wasm()).toBe(10);
  expect(sweeteners.to_pac_wasm()).toBe(10);

  sweeteners.sugars = new_sugars_unspecified(10);
  expect(() => sweeteners.sugars.to_pac_wasm()).toThrowError();
  expect(() => sweeteners.to_pac_wasm()).toThrowError();
});

test("Composition NaN values", () => {
  let composition = new Composition();

  expect(composition.get(CompKey.TotalSolids)).toBe(0);
  expect(composition.get(CompKey.Water)).toBe(100);
  expect(composition.get(CompKey.TotalFats)).toBe(0);
  expect(composition.get(CompKey.EmulsifiersPerFat)).toBe(NaN);
  expect(composition.get(CompKey.StabilizersPerWater)).toBe(0);
  expect(composition.get(CompKey.AbsPAC)).toBe(0);

  composition = new Composition();
  const solids = new Solids();
  const breakdown = new SolidsBreakdown();
  breakdown.snfs = 100;
  solids.other = breakdown;
  composition.solids = solids;

  expect(composition.get(CompKey.TotalSolids)).toBe(100);
  expect(composition.get(CompKey.Water)).toBe(0);
  expect(composition.get(CompKey.TotalFats)).toBe(0);
  expect(composition.get(CompKey.EmulsifiersPerFat)).toBe(NaN);
  expect(composition.get(CompKey.StabilizersPerWater)).toBe(NaN);
  expect(composition.get(CompKey.AbsPAC)).toBe(NaN);
});
