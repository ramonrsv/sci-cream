import { expect, test } from "vitest";

import { applyQtyToggle } from "./comp-values";
import { QtyToggle } from "./qty-toggle-select";

test("applyQtToggle preserves NaN", () => {
  expect(applyQtyToggle(NaN, 100, 100, QtyToggle.Percentage, true)).toBe(NaN);
  expect(applyQtyToggle(NaN, 100, 100, QtyToggle.Percentage, false)).toBe(NaN);
});
