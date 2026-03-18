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
