export const RECIPE_COLOR_BY_IDX = [
  "rgba(255, 105, 45, 1)", // Warm orange
  "rgba(59, 130, 246, 1)", // Bright blue
  "rgba(20, 184, 166, 1)", // Teal
  "rgba(234, 179, 8, 1)", // Golden yellow
  "rgba(239, 68, 68, 1)", // Coral red
  "rgba(168, 85, 247, 1)", // Vibrant purple
];

export const LEGEND_COLOR = "rgba(64, 64, 64, 1)";
export const GRID_COLOR = "rgba(120, 113, 108, 0.5)";

export const COMPONENT_BG_OPACITY = 0.5;
export const CHART_OPACITY = 0.95;

export function recipeColorByIdx(idx: number): string {
  return RECIPE_COLOR_BY_IDX[idx % RECIPE_COLOR_BY_IDX.length];
}

export function opacity(rgbaStr: string, opacity: number): string {
  return rgbaStr.replace(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/, (_, r, g, b) => {
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  });
}

export function recipeCompBgColor(idx: number): string {
  return opacity(recipeColorByIdx(idx), COMPONENT_BG_OPACITY);
}

export function recipeChartColor(idx: number): string {
  return opacity(recipeColorByIdx(idx), CHART_OPACITY);
}
