import { colord } from "colord";

import { Theme } from "../ui/theme-select";

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

const SSR_DEFAULT_COLOR = "rgba(0, 0, 0, 1)";

/** Descending opacity so each successive reference is lighter */
export const REFERENCE_OPACITIES = [0.6, 0.3] as const;

export function getCssColorVariable(name: string): string {
  if (typeof window === "undefined") return SSR_DEFAULT_COLOR;
  const styles = window.getComputedStyle(document.documentElement);
  return styles.getPropertyValue(name) || SSR_DEFAULT_COLOR;
}

export function getThemeCssColorVariable(
  lightName: string,
  darkName: string,
  theme: Theme,
): string {
  return getCssColorVariable(theme === Theme.Light ? lightName : darkName);
}

export function getColor(color: Color): string {
  return getCssColorVariable(color);
}

export function getLegendColor(theme: Theme): string {
  return getThemeCssColorVariable(Color.Legend, Color.LegendDark, theme);
}

export function getGridColor(theme: Theme): string {
  return getThemeCssColorVariable(Color.Grid, Color.GridDark, theme);
}

export function getReferenceOpacity(index: number): number {
  return REFERENCE_OPACITIES[index] ?? 0.2;
}

/** Add or update the alpha value of a CSS color string (e.g. hex, rgb, hsl) */
export function addOrUpdateAlpha(colorStr: string, opacity: number): string {
  return colord(colorStr).alpha(opacity).toRgbString();
}
