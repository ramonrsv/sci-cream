import { expect, test, describe } from "vitest";

import {
  applyQtyToggle,
  applyQtyToggleAndFormat,
  formatCompositionValue,
  padToFixedDecimalPosition,
} from "./comp-value-format";

import { QtyToggle } from "../app/_elements/selects/qty-toggle-select";

describe("padToFixedDecimalPosition", () => {
  test("pads integer part to the left and decimal to the right", () => {
    expect(padToFixedDecimalPosition(5.1, 2, 3, 2)).toBe("  5.1 ");
  });

  test("no padding needed when value fills width", () => {
    expect(padToFixedDecimalPosition(123.45, 2, 3, 2)).toBe("123.45");
  });

  test("truncates to specified decimals", () => {
    expect(padToFixedDecimalPosition(5.556, 2, 3, 2)).toBe("  5.56");
    expect(padToFixedDecimalPosition(5.554, 2, 3, 2)).toBe("  5.55");

    // floating-point behavior means (5.555).toFixed(2) === "5.55", not "5.56"
    expect(padToFixedDecimalPosition(5.555, 2, 3, 2)).toBe("  5.55");
  });

  test("integer with zero decimals appends space for decimal point", () => {
    expect(padToFixedDecimalPosition(7, 0, 2, 0)).toBe(" 7 ");
  });

  test("truncates to units when decimals is zero", () => {
    expect(padToFixedDecimalPosition(5.9, 0, 3, 2)).toBe("  6   ");
    expect(padToFixedDecimalPosition(5.4, 0, 3, 2)).toBe("  5   ");
  });

  test("integer value does not produce a decimal point, but a space", () => {
    expect(padToFixedDecimalPosition(5, 2, 3, 2)).toBe("  5   ");
  });

  test("trailing zeroes after rounding are not shown", () => {
    expect(padToFixedDecimalPosition(10.0, 2, 3, 2)).toBe(" 10   ");
    expect(padToFixedDecimalPosition(10.001, 2, 3, 2)).toBe(" 10   ");
  });

  test("zero value produces correct padding", () => {
    expect(padToFixedDecimalPosition(0, 2, 3, 2)).toBe("  0   ");
  });

  test("throws error for negative decimal and padding values", () => {
    expect(() => padToFixedDecimalPosition(5, -1, 3, 2)).toThrow("-1 must be non-negative");
    expect(() => padToFixedDecimalPosition(5, 2, -3, 2)).toThrow("-3 must be non-negative");
    expect(() => padToFixedDecimalPosition(5, 2, 3, -2)).toThrow("-2 must be non-negative");
  });

  test("throws error when decimal_pad_digits is less than decimals", () => {
    expect(() => padToFixedDecimalPosition(5, 3, 3, 2)).toThrow(
      "decimal_pad_digits must be >= decimals",
    );
  });
});

describe("formatCompositionValue", () => {
  test("returns empty string for undefined", () => {
    expect(formatCompositionValue(undefined)).toBe("");
  });

  test("returns dash for NaN", () => {
    expect(formatCompositionValue(NaN)).toBe("-");
  });

  test("formats values >= 1000 with k suffix, integer part loses decimal when zero", () => {
    expect(formatCompositionValue(1000)).toBe("  1k  ");
    expect(formatCompositionValue(2500)).toBe("  2.5k");
    expect(formatCompositionValue(3000)).toBe("  3k  ");
  });

  test("formats values < 10 with up to two decimal places", () => {
    expect(formatCompositionValue(0)).toBe("  0   ");
    expect(formatCompositionValue(5.12)).toBe("  5.12");
    expect(formatCompositionValue(5.1)).toBe("  5.1 ");
    expect(formatCompositionValue(5.556)).toBe("  5.56");
  });

  test("formats values >= 10 and < 1000 with up to one decimal place", () => {
    expect(formatCompositionValue(10.5)).toBe(" 10.5 ");
    expect(formatCompositionValue(10.56)).toBe(" 10.6 ");
    expect(formatCompositionValue(99.9)).toBe(" 99.9 ");
  });

  test("applies tens formatting after rounding to units", () => {
    expect(formatCompositionValue(9.99)).toBe(" 10   ");
  });

  test("applies k formatting after rounding to units", () => {
    expect(formatCompositionValue(999.6)).toBe("  1k  ");
  });
});

describe("applyQtyToggle", () => {
  test("preserves NaN", () => {
    for (const qtyToggle of Object.values(QtyToggle)) {
      expect(applyQtyToggle(NaN, 100, 100, qtyToggle, true)).toBe(NaN);
      expect(applyQtyToggle(NaN, 100, 100, qtyToggle, false)).toBe(NaN);
    }
  });

  test("returns undefined when comp is 0", () => {
    for (const qtyToggle of Object.values(QtyToggle)) {
      expect(applyQtyToggle(0, 100, 100, qtyToggle, true)).toBeUndefined();
      expect(applyQtyToggle(0, 100, 100, qtyToggle, false)).toBeUndefined();
    }
  });

  test("returns comp directly when isQty is false", () => {
    for (const qtyToggle of Object.values(QtyToggle)) {
      expect(applyQtyToggle(5, 100, 100, qtyToggle, false)).toBe(5);
      expect(applyQtyToggle(5, 100, 100, qtyToggle, false)).toBe(5);
      expect(applyQtyToggle(5, undefined, undefined, qtyToggle, false)).toBe(5);
    }
  });

  test("Composition toggle returns raw comp value", () => {
    expect(applyQtyToggle(5, 100, 500, QtyToggle.Composition, true)).toBe(5);
  });

  test("Quantity toggle returns comp * ingQty / 100", () => {
    // 2g/100g comp, 500g ingredient → 10g
    expect(applyQtyToggle(2, 500, undefined, QtyToggle.Quantity, true)).toBeCloseTo(10);
  });

  test("Quantity toggle returns undefined when ingQty is undefined", () => {
    expect(applyQtyToggle(5, undefined, 500, QtyToggle.Quantity, true)).toBeUndefined();
  });

  test("Percentage toggle returns comp * ingQty / mixTotal", () => {
    // 2g/100g comp, 500g ingredient, 1000g total → 1%
    expect(applyQtyToggle(2, 500, 1000, QtyToggle.Percentage, true)).toBeCloseTo(1);
  });

  test("Percentage toggle returns undefined when ingQty is undefined", () => {
    expect(applyQtyToggle(5, undefined, 1000, QtyToggle.Percentage, true)).toBeUndefined();
  });

  test("Percentage toggle returns undefined when mixTotal is undefined", () => {
    expect(applyQtyToggle(5, 100, undefined, QtyToggle.Percentage, true)).toBeUndefined();
  });
});

describe("applyQtyToggleAndFormat", () => {
  test("formats a Composition value", () => {
    expect(applyQtyToggleAndFormat(5.12, 100, 500, QtyToggle.Composition, true)).toBe("  5.12");
  });

  test("formats a Quantity value", () => {
    // 2.5g/100g comp, 500g ingredient → 12.5g
    expect(applyQtyToggleAndFormat(2.5, 500, undefined, QtyToggle.Quantity, true)).toBe(" 12.5 ");
  });

  test("returns empty string when result is undefined", () => {
    expect(applyQtyToggleAndFormat(5, undefined, undefined, QtyToggle.Quantity, true)).toBe("");
  });

  test("returns empty string when comp is 0", () => {
    expect(applyQtyToggleAndFormat(0, 100, 500, QtyToggle.Composition, true)).toBe("");
  });
});
