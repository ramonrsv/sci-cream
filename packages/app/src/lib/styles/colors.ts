import { Theme } from "../ui/theme-select";

export enum Color {
  GraphGreen = "--color-graph-green",
  GraphOrange = "--color-graph-orange",
  GraphBlue = "--color-graph-blue",
  GraphGray = "--color-graph-gray",
  Grid = "--color-grid",
  Legend = "--color-legend",
  GridDark = "--color-grid-dark",
  LegendDark = "--color-legend-dark",
}

const SSR_DEFAULT_COLOR = "rgba(0, 0, 0, 1)";

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

export function opacity(rgbaStr: string, opacity: number): string {
  return rgbaStr.replace(/rgb(a?)\((\d+), (\d+), (\d+)(, ([\d.]+))?\)/, (_, __, r, g, b) => {
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  });
}
