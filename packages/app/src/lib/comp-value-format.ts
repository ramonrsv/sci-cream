import { QtyToggle } from "../app/_elements/selects/qty-toggle-select";

import {
  composition_value_as_quantity as comp_val_as_qty,
  composition_value_as_percentage as comp_val_as_percent,
} from "@workspace/sci-cream";

import { verify, verifyAreNotNegative } from "./util";

/**
 * Formats a number to a fixed-width string whilst keeping the decimal point position fixed
 *
 * Formats a number to a fixed-width, specified by `unit_pad_digits` and `decimal_pad_digits`,
 * string with a specified maximum number of decimal places, while ensuring that the position
 * of the decimal point is fixed across all formatted numbers. This is useful for aligning
 * columns of numbers in a monospace font, making the values easier to compare visually.
 * If there are trailing zeros after rounding, they are replaced with spaces to show as few digits
 * as possible. If all decimal digits are zeros, the decimal point is also removed.
 *
 * @param num - The number to format.
 * @param decimals - Number of decimal places to round to. Must be ≤ `decimal_pad_digits`.
 * @param unit_pad_digits - Minimum width of the integer part (left-padded with spaces).
 * @param decimal_pad_digits - Minimum width of the fractional part (right-padded with spaces).
 * @param includePlusSign - Whether to include a `+` sign for positive values.
 */
export function padToFixedDecimalPosition(
  num: number,
  decimals: number,
  unit_pad_digits: number,
  decimal_pad_digits: number,
  includePlusSign: boolean = false,
) {
  verifyAreNotNegative(decimals, unit_pad_digits, decimal_pad_digits);
  verify(decimal_pad_digits >= decimals, "decimal_pad_digits must be >= decimals");

  const parts = Number(num.toFixed(decimals)).toString().split(".");
  if (includePlusSign && num > 0) {
    parts[0] = "+" + parts[0];
  }

  parts[0] = parts[0].padStart(unit_pad_digits, " ");
  if (parts.length === 1) {
    return parts[0] + " ".repeat(decimal_pad_digits + 1);
  } else {
    parts[1] = parts[1].padEnd(decimal_pad_digits, " ");
    return parts.join(".");
  }
}

/**
 * Formats a number that rounds to ≥ 1000 using a compact `k` suffix.
 *
 * This is similar to {@link padToFixedDecimalPosition} in that it produces a fixed-width string
 * with a fixed decimal point position, but it divides the number by 1000, appends a `k` suffix, and
 * allows at most one decimal place. If the value is an exact multiple of 1000, it is shown as an
 * integer (e.g. `"  2k  "`), otherwise one decimal place is shown (e.g. `"  2.5k"`).
 *
 * @param num - The number to format. Must round to ≥ 1000.
 * @param includePlusSign - Whether to include a `+` sign for positive values.
 */
function formatThousands(num: number, includePlusSign: boolean = false) {
  const numInt = num ? Math.round(num) : num;
  const numIntAbs = numInt ? Math.abs(numInt) : numInt;

  verify(
    numIntAbs! >= 1000,
    () => `abs(num) ${Math.abs(num)} must round to >= 1000 for formatThousands`,
  );

  const optPlusSign = includePlusSign && num > 0 ? "+" : "";

  return numIntAbs! % 1000 > 0
    ? padToFixedDecimalPosition(num / 1000, 1, 3, 1, includePlusSign) + "k"
    : (optPlusSign + (numInt / 1000).toString()).padStart(3, " ") + "k  ";
}

/**
 * Formats a composition value for display in the UI.
 *
 * - `undefined` → `""`
 * - `NaN` → `"-"`
 * - ≥ 1000 → compact `k` suffix via {@link formatThousands}
 * - < 10 → two decimal places (e.g. `"  5.12"`) via {@link padToFixedDecimalPosition}
 * - 10–999 → one decimal place (e.g. `" 99.9 "`) via {@link padToFixedDecimalPosition}
 *
 * All branches produce a fixed-width string suitable for monospace column alignment.
 *
 * @param num - The composition value (g/100g), or `undefined` for an empty cell.
 * @param includePlusSign - Whether to include a `+` sign for positive values.
 */
export function formatCompositionValue(
  num: number | undefined,
  includePlusSign: boolean = false,
  maxDecimalPlaces: number = 2,
): string {
  verify(maxDecimalPlaces === 2 || maxDecimalPlaces === 1, "maxDecimalPlaces must be in [1, 2]");

  const numIntAbs = num ? Math.abs(Math.round(num)) : num;
  const decAdj = 2 - maxDecimalPlaces;

  return num === undefined
    ? ""
    : Number.isNaN(num)
      ? "-"
      : numIntAbs! >= 1000
        ? formatThousands(num, includePlusSign)
        : numIntAbs! < 10
          ? padToFixedDecimalPosition(num, 2 - decAdj, 3, 2 - decAdj, includePlusSign)
          : padToFixedDecimalPosition(num, 1 - decAdj, 3, 2 - decAdj, includePlusSign);
}

/**
 * Rounds a number to the nearest value that matches the composition value format.
 *
 * Snaps a number (e.g. one carrying floating-point noise) to its displayed precision, for example
 * so a {@link WatcherCard} target matches the value shown and balancing can hit it exactly.
 *
 * @param num - The number to round.
 */
export function roundToCompositionValueFormat(num: number) {
  return parseFloat(formatCompositionValue(num));
}

/**
 * Relative tolerance for the balancer's target-feasibility warnings, matched to the display
 * precision {@link roundToCompositionValueFormat} rounds targets to.
 *
 * Targets are shown — and stored — at ~2–3 significant figures (0.01 below 10, 0.1 for 10–999), so
 * a target can never sit exactly on a narrow or pinned reachable band. Passed to the WASM
 * `validate_recipe_targets` as its relative tolerance so a target within this fraction of the band
 * is treated as feasible instead of raising a spurious warning. ~1% comfortably covers the coarsest
 * rounding for values above ~0.5; it is an engineering estimate, not a sourced constant.
 */
export const TARGET_FEASIBILITY_REL_TOL = 0.01;

/** Get the step size for a composition value so that it matches the displayed precision. */
export function compositionFormatStep(num: number | undefined): number {
  if (num === undefined || Number.isNaN(num)) return 1;

  const numIntAbs = Math.abs(Math.round(num));
  return numIntAbs >= 1000 ? 1 : numIntAbs < 10 ? 0.01 : 0.1;
}

/**
 * Converts a raw composition value according to the active {@link QtyToggle} mode.
 *
 * - When `comp` is `0`, returns `undefined` (zero values are not displayed).
 * - When `isQty` is `false`, returns `comp` unchanged (non-quantity value, e.g. temperature).
 * - `QtyToggle.Composition` — returns `comp` as-is (g/100g).
 * - `QtyToggle.Quantity` — returns the composition value as an absolute quantity in grams, based
 *    on `ingQty`; see {@link composition_value_as_quantity}
 * - `QtyToggle.Percentage` — returns the percentage of the absolute composition value relative to
 *    the total mix; see {@link composition_value_as_percentage}
 *
 * @param comp - Raw composition value in g/100g.
 * @param ingQty - Ingredient quantity in grams, used for Quantity and Percentage modes.
 * @param mixTotal - Total mix quantity in grams, used for Percentage mode.
 * @param qtyToggle - The active display mode.
 * @param isQty - Whether this row represents a quantity value (as opposed to, say temperature).
 */
export function applyQtyToggle(
  comp: number,
  ingQty: number | undefined,
  mixTotal: number | undefined,
  qtyToggle: QtyToggle,
  isQty: boolean,
): number | undefined {
  if (comp !== 0.0) {
    if (!isQty) {
      return comp;
    }

    switch (qtyToggle) {
      case QtyToggle.Composition:
        return comp;
      case QtyToggle.Quantity:
        return ingQty ? comp_val_as_qty(comp, ingQty) : undefined;
      case QtyToggle.Percentage:
        return ingQty && mixTotal ? comp_val_as_percent(comp, ingQty, mixTotal) : undefined;
    }
  }
}

/**
 * Convenience wrapper that applies {@link applyQtyToggle} and formats the result
 * with {@link formatCompositionValue} in a single call.
 */
export function applyQtyToggleAndFormat(
  comp: number,
  ingQty: number | undefined,
  mixTotal: number | undefined,
  qtyToggle: QtyToggle,
  isQty: boolean,
  includePlusSign: boolean = false,
): string {
  return formatCompositionValue(
    applyQtyToggle(comp, ingQty, mixTotal, qtyToggle, isQty),
    includePlusSign,
  );
}

/**
 * Computes the `main − reference` delta between two recipes' values for one property.
 *
 * Both values are first converted through {@link applyQtyToggle}, so the delta is expressed in the
 * active display units (g, %, or the raw value for non-quantity properties).
 *
 * - `isRelative` — whether the delta is an absolute difference or a relative percent change.
 * - When the difference is `0`, returns `undefined` (zero values are not displayed).
 * - Returns `NaN` when the reference value is `0` and `isRelative` is `true`, since it's not
 *   possible to compute a relative change in this case; this is displayed as `"-"` in the UI.
 */
export function computeDelta(
  mainComp: number,
  mainTotal: number | undefined,
  refComp: number,
  refTotal: number | undefined,
  qtyToggle: QtyToggle,
  isQty: boolean,
  isRelative: boolean,
): number | undefined {
  const mainVal = applyQtyToggle(mainComp, mainTotal, mainTotal, qtyToggle, isQty) ?? 0;
  const refVal = applyQtyToggle(refComp, refTotal, refTotal, qtyToggle, isQty) ?? 0;
  const delta = mainVal - refVal;

  return delta === 0
    ? undefined
    : isRelative
      ? refVal === 0
        ? NaN
        : (delta / refVal) * 100
      : delta;
}

/**
 * Convenience wrapper that computes a delta via {@link computeDelta} and formats the result
 * with {@link formatCompositionValue} in a single call.
 */
export function computeDeltaAndFormat(
  mainComp: number,
  mainTotal: number | undefined,
  refComp: number,
  refTotal: number | undefined,
  qtyToggle: QtyToggle,
  isQty: boolean,
  isRelative: boolean,
) {
  return formatCompositionValue(
    computeDelta(mainComp, mainTotal, refComp, refTotal, qtyToggle, isQty, isRelative),
    true,
  );
}
