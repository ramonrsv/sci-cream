export const RECIPE_COLOR_BY_IDX = [
  "rgba(59, 130, 246, 1)",
  "rgba(220, 38, 38, 1)",
  "rgba(234, 179, 8, 1)",
];

export const GRID_COLOR = "rgba(120, 113, 108, 0.5)";

export const COMPONENT_BG_OPACITY = 0.5;
export const CHART_OPACITY = 0.8;

export function recipeColorByIdx(idx: number): string {
  return RECIPE_COLOR_BY_IDX[idx];
}

export function opacity(rgbaStr: string, opacity: number): string {
  return rgbaStr.replace(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/, (_, r, g, b) => {
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  });
}

export function recipeCompBgColor(idx: number): string {
  return opacity(RECIPE_COLOR_BY_IDX[idx], COMPONENT_BG_OPACITY);
}

export function recipeChartColor(idx: number): string {
  return opacity(RECIPE_COLOR_BY_IDX[idx], CHART_OPACITY);
}
