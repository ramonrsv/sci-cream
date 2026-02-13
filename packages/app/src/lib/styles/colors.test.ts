import { expect, test } from "vitest";

import { addOrUpdateAlpha } from "./colors";

test("addOrUpdateAlpha correctly replaces alpha value", () => {
  expect(addOrUpdateAlpha("rgba(100, 150, 200, 0.8)", 0.5)).toBe("rgba(100, 150, 200, 0.5)");
});

test("addOrUpdateAlpha correctly converts rgb to rgba", () => {
  expect(addOrUpdateAlpha("rgb(100, 150, 200)", 0.5)).toBe("rgba(100, 150, 200, 0.5)");
});

test("addOrUpdateAlpha supports optional commas", () => {
  expect(addOrUpdateAlpha("rgb(100 150 200)", 0.5)).toBe("rgba(100, 150, 200, 0.5)");
});

test("addOrUpdateAlpha supports hex colors", () => {
  expect(addOrUpdateAlpha("#6496c8", 0.5)).toBe("rgba(100, 150, 200, 0.5)");
});
