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
 * Returns a `Color` representing how `value` sits within the acceptable `{ min, max }` range:
 *
 * - Green — within the inner 70% of the range (ideal band)
 * - Yellow — within the range but outside the ideal band
 * - Orange — within 15% outside the range on either side
 * - RedDull — further out than 15% beyond the range
 */
export function getRangeColor(value: number, range: { min: number; max: number }): Color {
  const span = range.max - range.min;
  const idealMin = range.min + span * 0.15;
  const idealMax = range.max - span * 0.15;
  const expandedMin = range.min - span * 0.15;
  const expandedMax = range.max + span * 0.15;

  if (value > idealMin && value < idealMax) return Color.GraphGreen;
  if (value > range.min && value < range.max) return Color.GraphYellow;
  if (value > expandedMin && value < expandedMax) return Color.GraphOrange;
  return Color.GraphRedDull;
}
