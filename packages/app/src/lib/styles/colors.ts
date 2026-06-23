import { colord } from "colord";

import { Theme } from "@/lib/theme";

/** CSS custom property names for chart and UI colors */
export enum Color {
  GraphBlue = "--color-graph-blue",
  GraphGreen = "--color-graph-green",
  GraphYellow = "--color-graph-yellow",
  GraphOrange = "--color-graph-orange",
  GraphRed = "--color-graph-red",
  GraphGray = "--color-graph-gray",
  GraphGreenDull = "--color-graph-green-dull",
  GraphRedDull = "--color-graph-red-dull",
  Grid = "--color-grid",
  Legend = "--color-legend",
  GridDark = "--color-grid-dark",
  LegendDark = "--color-legend-dark",
}

/** Fallback color returned when running server-side (no `window.getComputedStyle` available) */
const SSR_DEFAULT_COLOR = "rgba(0, 0, 0, 1)";

/** Descending opacity so each successive reference is lighter */
export const REFERENCE_OPACITIES = [0.6, 0.3] as const;

/**
 * Read a CSS custom color property value from the document root
 *
 * Returns `SSR_DEFAULT_COLOR` when running server-side.
 */
export function getCssColorVariable(name: string): string {
  if (typeof window === "undefined") return SSR_DEFAULT_COLOR;
  const styles = window.getComputedStyle(document.documentElement);
  return styles.getPropertyValue(name) || SSR_DEFAULT_COLOR;
}

/** Resolve a CSS custom property using the light or dark variant depending on the current theme */
export function getThemeCssColorVariable(
  lightName: string,
  darkName: string,
  theme: Theme,
): string {
  return getCssColorVariable(theme === Theme.Light ? lightName : darkName);
}

/** Resolve a `Color` enum value to its current CSS color string */
export function getColor(color: Color): string {
  return getCssColorVariable(color);
}

/** Returns the legend text color for the given theme */
export function getLegendColor(theme: Theme): string {
  return getThemeCssColorVariable(Color.Legend, Color.LegendDark, theme);
}

/** Returns the chart grid line color for the given theme */
export function getGridColor(theme: Theme): string {
  return getThemeCssColorVariable(Color.Grid, Color.GridDark, theme);
}

/** Returns the opacity for a reference recipe bar at the given zero-based index; fallback 0.2 */
export function getReferenceOpacity(index: number): number {
  return REFERENCE_OPACITIES[index] ?? 0.2;
}

/** Add or update the alpha value of a CSS color string (e.g. hex, rgb, hsl) */
export function addOrUpdateAlpha(colorStr: string, opacity: number): string {
  return colord(colorStr).alpha(opacity).toRgbString();
}

/**
 * Returns a CSS `var(...)` reference for the given `Color` — SSR-safe replacement for
 * {@link getColor} when assigning to an inline `style` attribute (whose resolved value would
 * differ between server and client and trigger a hydration mismatch).
 */
export function colorVar(color: Color): string {
  return `var(${color})`;
}

/**
 * Returns a CSS `color-mix(...)` expression that applies `alpha` (0–1) to the given `Color`
 * variable, suitable for use in inline `style` attributes. SSR-safe, like {@link colorVar}.
 */
export function colorVarWithAlpha(color: Color, alpha: number): string {
  return `color-mix(in srgb, var(${color}) ${alpha * 100}%, transparent)`;
}

/**
 * Rank a status `Color` by severity: Green=0, Yellow=1, Orange=2, RedDull=3; throw for non-status.
 * Used by {@link worseStatusColor} to pick the higher-severity of two status colors.
 */
export function statusColorRank(color: Color): number {
  switch (color) {
    case Color.GraphGreen:
      return 0;
    case Color.GraphYellow:
      return 1;
    case Color.GraphOrange:
      return 2;
    case Color.GraphRedDull:
      return 3;
    default:
      throw new Error(`Invalid status color: ${color}`);
  }
}

/** Returns whichever of `a` or `b` has the higher severity rank (ties go to `a`). */
export function worseStatusColor(a: Color, b: Color): Color {
  return statusColorRank(a) >= statusColorRank(b) ? a : b;
}

/**
 * Returns a `Color` representing how close `value` is to `target` as a relative delta percentage,
 * with the regions delineated by `stepPercent` as percentage points (default 5%):
 *
 * - Green — delta <= (target * stepPercent), default within 5% of target
 * - Yellow — delta <= (target * 2 * stepPercent), default within 10% of target
 * - Orange — delta <= (target * 3 * stepPercent), default within 15% of target
 * - RedDull — delta > (target * 3 * stepPercent), default more than 15% away from target
 *
 * Note: A `stepPercent` of zero yields a pure Green/Red split at the exact `target` threshold,
 * which should not be used as it is susceptible to floating-point precision issues.
 */
export function getTargetColor(value: number, target: number, stepPercent: number = 0.05): Color {
  const delta = Math.abs(value - target) / target;
  if (delta <= stepPercent) return Color.GraphGreen;
  if (delta <= 2 * stepPercent) return Color.GraphYellow;
  if (delta <= 3 * stepPercent) return Color.GraphOrange;
  return Color.GraphRedDull;
}

/**
 * Returns a `Color` representing how `value` sits within the acceptable `{ min, max }` range, with
 * the regions delineated by `stepPercent` as a percentage of the total range span (default 15%):
 *
 * - Green — within the inner ideal band `{min + span * stepPercent, max - span * stepPercent}`
 * - Yellow — within the range but outside the ideal band
 * - Orange — within `{min - span * stepPercent, min}` or `{max, max + span * stepPercent}`
 * - RedDull — below `min - span * stepPercent` or above `max + span * stepPercent`
 *
 * Note: A `stepPercent` of zero yields a pure Green/Red split at the `min` and `max` thresholds.
 */
export function getRangeColor(
  value: number,
  range: { min: number; max: number },
  stepPercent: number = 0.15,
): Color {
  const span = range.max - range.min;
  const idealMin = range.min + span * stepPercent;
  const idealMax = range.max - span * stepPercent;
  const expandedMin = range.min - span * stepPercent;
  const expandedMax = range.max + span * stepPercent;

  if (value >= idealMin && value <= idealMax) return Color.GraphGreen;
  if (value >= range.min && value <= range.max) return Color.GraphYellow;
  if (value >= expandedMin && value <= expandedMax) return Color.GraphOrange;
  return Color.GraphRedDull;
}
