"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type TooltipItem,
  type ScriptableContext,
  type ScriptableScaleContext,
} from "chart.js";

import { RecipeSummary } from "@/lib/recipe";
import { useTheme } from "@/lib/theme";
import { GRAPH_TITLE_FONT_SIZE } from "@/lib/styles/sizes";
import { prefersReducedMotion } from "@/lib/styles/motion";

import { Color, ThemeColor, getColor, addOrUpdateAlpha } from "@/lib/styles/colors";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

/** Line width (px) for the main recipe's curves (wider than references for emphasis). */
const MAIN_LINE_WIDTH = 4;
/** Line width (px) for reference recipes' curves. */
const REF_LINE_WIDTH = 3;
/** Dash pattern for the "Frozen Water" curve, distinguishing it from the solid "Hardness" line. */
const FROZEN_WATER_DASH = [3, 3];
/** Alpha at the top of the main curve's area fill gradient (fades to transparent below). */
const FILL_GRADIENT_TOP_ALPHA = 0.3;
/** Gradient stop (0–1) at which the area fill has faded fully to transparent. */
const FILL_GRADIENT_FADE_STOP = 0.9;
/** Radius (px) of the highlighted ideal-serving point marker. */
const HIGHLIGHT_POINT_RADIUS = 6;
/** Border width (px) for point markers. */
const POINT_BORDER_WIDTH = 2;
/** Line width (px) for the custom legend swatches. */
const LEGEND_LINE_WIDTH = 2;
/** Draw an x-axis grid line and tick label only on multiples of this interval. */
const GRID_TICK_INTERVAL = 5;
/** Y-axis bounds (°C): the chart shows the sub-zero freezing range. */
const Y_AXIS_MIN = -30;
const Y_AXIS_MAX = 0;

/**
 * Bare line chart visualizing FPD curves (hardness and frozen water) for a main recipe plus zero
 * or more reference recipes. The main recipe is drawn with a wider, filled blue line and the
 * reference recipes with thinner gray lines, with a highlight marker at the ideal serving point.
 *
 * Consumer is responsible for sizing the chart via a parent container.
 */
export function FpdGraph({ main, refs = [] }: { main: RecipeSummary; refs?: RecipeSummary[] }) {
  // Subscribe to the theme so the canvas re-reads the cascaded colors and repaints when it flips.
  useTheme();

  const gridColor = getColor(ThemeColor.Border);
  const legendColor = getColor(ThemeColor.TextPrimary);

  /** Ideal serving 'hardness' value, in [0, 100], used to place a highlight point */
  const highlightedHardnessPercent = 75;

  /** Returns `true` when the given dataset point should be rendered as a highlight marker */
  const shouldHighlight = (lineLabel: string, pointIdx: number) => {
    return lineLabel === "Hardness" && pointIdx === highlightedHardnessPercent;
  };

  /** All recipes in display order: main first, then refs */
  const recipes: { recipe: RecipeSummary; isMain: boolean }[] = [
    { recipe: main, isMain: true },
    ...refs.map((r) => ({ recipe: r, isMain: false })),
  ];

  /** Chart.js dataset configuration built from the active recipes' FPD curves */
  const graphData = {
    labels: Array.from({ length: 101 }, (_, i) => i),
    datasets: recipes.flatMap(({ recipe, isMain }) => {
      const recipeColor = isMain ? getColor(Color.GraphBlue) : getColor(Color.GraphGray);

      const curves = recipe.mixProperties.fpd!.curves!;
      const borderWidth = isMain ? MAIN_LINE_WIDTH : REF_LINE_WIDTH;
      const borderColor = recipeColor;
      const recipeLabel = isMain ? "" : ` (${recipe.name || recipe.id})`;

      const lines = [
        { lineLabel: "Hardness", curve: curves.hardness },
        { lineLabel: "Frozen Water", borderDash: FROZEN_WATER_DASH, curve: curves.frozen_water },
      ];

      return lines.map(({ lineLabel, borderDash, curve }) => ({
        // Stable identity for react-chartjs-2 dataset matching across renders. Using `recipe.id`
        // (slot id, e.g. "Recipe" / "Ref A") combined with the line label gives each dataset a
        // unique, edit-resilient id — the chart no longer needs to lean on `recipeLabel` for
        // disambiguation, so renaming a ref recipe doesn't make its lines jump on every keystroke.
        id: `${recipe.id}:${lineLabel}`,
        label: `${lineLabel}${recipeLabel}`,
        data: curve.map((point) => (point.temp >= 0 ? NaN : point.temp)),
        borderWidth: borderWidth,
        borderColor: borderColor,
        backgroundColor: (context: ScriptableContext<"line">) => {
          if (!context.chart.chartArea) return addOrUpdateAlpha(borderColor, 0);
          const { ctx, chartArea: ca } = context.chart;

          const gradient = ctx.createLinearGradient(ca.right, ca.top, ca.left, ca.bottom);

          gradient.addColorStop(0, addOrUpdateAlpha(borderColor, FILL_GRADIENT_TOP_ALPHA));
          gradient.addColorStop(FILL_GRADIENT_FADE_STOP, addOrUpdateAlpha(borderColor, 0));

          return gradient;
        },
        borderDash: borderDash,
        fill: isMain && lineLabel === "Hardness" ? "start" : false,
        pointRadius: curve.map((_, i) =>
          shouldHighlight(lineLabel, i) ? HIGHLIGHT_POINT_RADIUS : 0,
        ),
        pointBackgroundColor: curve.map((_, i) =>
          shouldHighlight(lineLabel, i) ? "#fff" : borderColor,
        ),
        pointBorderColor: borderColor,
        pointBorderWidth: POINT_BORDER_WIDTH,
      }));
    }),
  };

  /** Shared legend label style applied to all custom legend entries */
  const labelProps = {
    hidden: false,
    lineWidth: LEGEND_LINE_WIDTH,
    strokeStyle: legendColor,
    fillStyle: "rgba(0, 0, 0, 0)",
    fontColor: legendColor,
  };

  /** Chart.js options controlling layout, legend, tooltip, and axis configuration */
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    // Disable the canvas entry/resize animation under reduced motion so screenshots are stable;
    animation: prefersReducedMotion() ? (false as const) : undefined,
    color: legendColor,
    plugins: {
      legend: {
        display: true,
        position: "chartArea" as const,
        align: "end" as const,
        labels: {
          color: legendColor,
          generateLabels: () => {
            return [
              { text: "Hardness", ...labelProps },
              { text: "Frozen Water", lineDash: FROZEN_WATER_DASH, ...labelProps },
            ];
          },
        },
      },
      title: {
        display: true,
        text: "FPD Graph",
        color: legendColor,
        font: { size: GRAPH_TITLE_FONT_SIZE },
      },
      tooltip: {
        callbacks: {
          label: function (context: TooltipItem<"line">) {
            const lineName = context.dataset.label;
            const temp = context.parsed.y?.toFixed(1);
            const frozenWaterPercent = context.parsed.x;

            return `${temp}°C @${frozenWaterPercent}% ${
              shouldHighlight(lineName ?? "", context.dataIndex)
                ? " (Ideal Serving Temperature)"
                : ""
            }`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: legendColor,
          autoSkip: false,
          callback: function (value: string | number) {
            const numValue = Number(value);
            return numValue % GRID_TICK_INTERVAL === 0 ? numValue : "";
          },
        },
        grid: {
          color: gridColor,
          display: true,
          drawOnChartArea: true,
          lineWidth: function (context: ScriptableScaleContext) {
            return context.tick.value % GRID_TICK_INTERVAL === 0 ? 1 : 0;
          },
        },
      },
      y: {
        min: Y_AXIS_MIN,
        max: Y_AXIS_MAX,
        ticks: { color: legendColor },
        title: { display: true, text: "Temperature (°C)", color: legendColor },
        grid: { color: gridColor },
      },
    },
  };

  return <Line data={graphData} options={options} datasetIdKey="id" />;
}
