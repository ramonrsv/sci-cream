import { Theme } from "../ui/theme-select";

export const RECIPE_COLOR_BY_IDX = [
  "rgba(255, 105, 45, 1)", // Warm orange
  "rgba(59, 130, 246, 1)", // Bright blue
  "rgba(20, 184, 166, 1)", // Teal
  "rgba(234, 179, 8, 1)", // Golden yellow
  "rgba(239, 68, 68, 1)", // Coral red
  "rgba(168, 85, 247, 1)", // Vibrant purple
];

export const COMPONENT_BG_OPACITY = 0.6;
export const CHART_OPACITY = 0.95;

const SSR_DEFAULT_LEGEND_COLOR = "rgba(64, 64, 64, 1)";
const SSR_DEFAULT_GRID_COLOR = "rgba(200, 200, 200, 1)";

export function getLegendColor(theme: Theme): string {
  if (typeof window === "undefined") return SSR_DEFAULT_LEGEND_COLOR;

  const styles = window.getComputedStyle(document.documentElement);

  return theme === Theme.Dark
    ? styles.getPropertyValue("--color-legend-dark")
    : styles.getPropertyValue("--color-legend");
}

export function getGridColor(theme: Theme): string {
  if (typeof window === "undefined") return SSR_DEFAULT_GRID_COLOR;

  const styles = window.getComputedStyle(document.documentElement);

  return theme === Theme.Dark
    ? styles.getPropertyValue("--color-grid-dark")
    : styles.getPropertyValue("--color-grid");
}

export function getRecipeColorByIdx(idx: number): string {
  return RECIPE_COLOR_BY_IDX[idx % RECIPE_COLOR_BY_IDX.length];
}

export function opacity(rgbaStr: string, opacity: number): string {
  return rgbaStr.replace(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/, (_, r, g, b) => {
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  });
}

export function getRecipeCompBgColor(idx: number): string {
  return opacity(getRecipeColorByIdx(idx), COMPONENT_BG_OPACITY);
}

export function getRecipeChartColor(idx: number): string {
  return opacity(getRecipeColorByIdx(idx), CHART_OPACITY);
}
