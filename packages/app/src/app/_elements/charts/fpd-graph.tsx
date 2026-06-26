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
import {
  CHART_TOP_PADDING,
  TOOLTIP_CORNER_RADIUS,
  TOOLTIP_PADDING,
  TOOLTIP_BORDER_WIDTH,
  TOOLTIP_BODY_FONT,
} from "@/lib/styles/sizes";
import { prefersReducedMotion } from "@/lib/styles/motion";

import {
  Color,
  ThemeColor,
  getColor,
  addOrUpdateAlpha,
  flattenAlphaOnto,
  REFERENCE_TICK_ALPHA,
} from "@/lib/styles/colors";

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
/** Invisible hover hit area (px) around every point, so any point along a line is easy to hover. */
const POINT_HIT_RADIUS = 10;
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
  const tickColor = getColor(ThemeColor.TextSecondary);
  const surfaceColor = getColor(ThemeColor.Surface);

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

  /**
   * Per-dataset metadata in `graphData.datasets` order (two lines per recipe), indexed by
   * `datasetIndex` so the tooltip titles the popup with the recipe name, like `PropertiesBarChart`.
   */
  const datasetMeta = recipes.flatMap(({ recipe, isMain }) =>
    ["Hardness", "Frozen Water"].map((lineType) => ({
      recipeName: recipe.name || recipe.id,
      lineType,
      isMain,
    })),
  );

  /** Chart.js dataset configuration built from the active recipes' FPD curves */
  const graphData = {
    labels: Array.from({ length: 101 }, (_, i) => i),
    datasets: recipes.flatMap(({ recipe, isMain }) => {
      // References use an opaque muted gray: the alpha is flattened onto the surface so a ref's
      // coincident Hardness/Frozen-Water lines don't composite into a false dashed look.
      const recipeColor = isMain
        ? getColor(Color.GraphBlue)
        : flattenAlphaOnto(getColor(Color.GraphGray), surfaceColor, REFERENCE_TICK_ALPHA);

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
          shouldHighlight(lineLabel, i) ? surfaceColor : borderColor,
        ),
        pointBorderColor: borderColor,
        pointBorderWidth: POINT_BORDER_WIDTH,
        pointHitRadius: POINT_HIT_RADIUS,
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
    // No chart title: the panel context already names the chart, and dropping it reclaims height.
    layout: { padding: { top: CHART_TOP_PADDING } },
    plugins: {
      legend: {
        display: true,
        position: "chartArea" as const,
        align: "end" as const,
        // Fixed Hardness/Frozen-Water swatches, not per-recipe — disable click-to-toggle.
        onClick: () => undefined,
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
      tooltip: {
        backgroundColor: surfaceColor,
        borderColor: gridColor,
        borderWidth: TOOLTIP_BORDER_WIDTH,
        titleColor: legendColor,
        bodyColor: legendColor,
        cornerRadius: TOOLTIP_CORNER_RADIUS,
        padding: TOOLTIP_PADDING,
        bodyFont: { family: TOOLTIP_BODY_FONT },
        callbacks: {
          title: function (items: TooltipItem<"line">[]) {
            const idx = items[0]?.datasetIndex;
            return idx === undefined ? "" : (datasetMeta[idx]?.recipeName ?? "");
          },
          label: function (context: TooltipItem<"line">) {
            const meta = datasetMeta[context.datasetIndex];
            const lineType = meta?.lineType ?? "";
            const percent = context.parsed.x;
            const temp = context.parsed.y?.toFixed(1);
            const ideal =
              meta?.isMain && shouldHighlight(lineType, context.dataIndex)
                ? " (Ideal Serving Temp)"
                : "";

            return `${lineType}: ${percent}% at ${temp}°C${ideal}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: tickColor,
          autoSkip: false,
          callback: function (value: string | number) {
            const numValue = Number(value);
            return numValue % GRID_TICK_INTERVAL === 0 ? numValue : "";
          },
        },
        border: { display: false },
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
        ticks: { color: tickColor },
        title: { display: true, text: "Temperature (°C)", color: tickColor },
        border: { display: false },
        grid: { color: gridColor },
      },
    },
  };

  return <Line data={graphData} options={options} datasetIdKey="id" />;
}
