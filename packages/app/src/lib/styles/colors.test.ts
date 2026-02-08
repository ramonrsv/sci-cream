import { expect, test } from "vitest";

import { opacity } from "./colors";

test("opacity correctly replaces alpha value", () => {
  expect(opacity("rgba(100, 150, 200, 0.8)", 0.5)).toBe("rgba(100, 150, 200, 0.5)");
});

test("opacity correctly converts rgb to rgba", () => {
  expect(opacity("rgb(100, 150, 200)", 0.5)).toBe("rgba(100, 150, 200, 0.5)");
});
