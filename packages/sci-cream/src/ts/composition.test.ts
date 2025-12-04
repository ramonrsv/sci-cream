import { expect, test } from "vitest";

import { Sugars, Sweeteners } from "../../dist/index";

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
