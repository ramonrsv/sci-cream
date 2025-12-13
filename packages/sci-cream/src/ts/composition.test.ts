import { expect, test } from "vitest";

import { Sugars, Sweeteners } from "../../dist/index";

function new_sugars_sucrose(amount: number): Sugars {
  const sugars = new Sugars();
  sugars.sucrose = amount;
  return sugars;
}

test("Sugars.to_pod", () => {
  expect(new_sugars_sucrose(10).to_pod()).toBe(10);
});

test("Sugars.to_pac", () => {
  expect(new_sugars_sucrose(10).to_pac()).toBe(10);
});

test("Sweeteners.to_pod_js", () => {
  const sweeteners = new Sweeteners();

  sweeteners.sugars = new_sugars_sucrose(10);
  expect(sweeteners.sugars.to_pod()).toBe(10);
  expect(sweeteners.to_pod_js()).toBe(10);

  sweeteners.artificial = 10;
  expect(sweeteners.to_pod_js()).toBeUndefined();
});

test("Sweeteners.to_pac_js", () => {
  const sweeteners = new Sweeteners();

  sweeteners.sugars = new_sugars_sucrose(10);
  expect(sweeteners.sugars.to_pac()).toBe(10);
  expect(sweeteners.to_pac_js()).toBe(10);

  sweeteners.artificial = 10;
  expect(sweeteners.to_pac_js()).toBeUndefined();
});
