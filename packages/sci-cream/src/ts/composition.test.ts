import { expect, test } from "vitest";

import { Sugars } from "../../dist/index";

test("Sugars.to_pod_js", () => {
  const sugars = new Sugars();

  sugars.sucrose = 10;
  expect(sugars.to_pod_js()).toBe(10);

  sugars.unspecified = 10;
  expect(sugars.to_pod_js()).toBeUndefined();
});

test("Sugars.to_pac_js", () => {
  const sugars = new Sugars();

  sugars.sucrose = 10;
  expect(sugars.to_pac_js()).toBe(10);

  sugars.unspecified = 10;
  expect(sugars.to_pac_js()).toBeUndefined();
});
