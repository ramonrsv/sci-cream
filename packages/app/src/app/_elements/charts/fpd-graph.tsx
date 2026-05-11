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

import {
  Color,
  getColor,
  addOrUpdateAlpha,
  getLegendColor,
  getGridColor,
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

/**
 * Bare line chart visualizing FPD curves (hardness and frozen water) for a main recipe plus zero
 * or more reference recipes. The main recipe is drawn with a wider, filled blue line and the
 * reference recipes with thinner gray lines, with a highlight marker at the ideal serving point.
 *
 * Consumer is responsible for sizing the chart via a parent container.
 */
export function FpdGraph({ main, refs = [] }: { main: RecipeSummary; refs?: RecipeSummary[] }) {
  const { theme } = useTheme();

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
      const borderWidth = isMain ? 4 : 3;
      const borderColor = recipeColor;
      const recipeLabel = isMain ? "" : ` (${recipe.name || recipe.id})`;

      const lines = [
        { lineLabel: "Hardness", curve: curves.hardness },
        { lineLabel: "Frozen Water", borderDash: [3, 3], curve: curves.frozen_water },
      ];

      return lines.map(({ lineLabel, borderDash, curve }) => ({
        label: `${lineLabel}${recipeLabel}`,
        data: curve.map((point) => (point.temp >= 0 ? NaN : point.temp)),
        borderWidth: borderWidth,
        borderColor: borderColor,
        backgroundColor: (context: ScriptableContext<"line">) => {
          if (!context.chart.chartArea) return addOrUpdateAlpha(borderColor, 0);
          const { ctx, chartArea: ca } = context.chart;

          const gradient = ctx.createLinearGradient(ca.right, ca.top, ca.left, ca.bottom);

          gradient.addColorStop(0, addOrUpdateAlpha(borderColor, 0.3));
          gradient.addColorStop(0.9, addOrUpdateAlpha(borderColor, 0));

          return gradient;
        },
        borderDash: borderDash,
        fill: isMain && lineLabel === "Hardness" ? "start" : false,
        pointRadius: curve.map((_, i) => (shouldHighlight(lineLabel, i) ? 6 : 0)),
        pointBackgroundColor: curve.map((_, i) =>
          shouldHighlight(lineLabel, i) ? "#fff" : borderColor,
        ),
        pointBorderColor: borderColor,
        pointBorderWidth: 2,
      }));
    }),
  };

  const gridColor = getGridColor(theme);
  const legendColor = getLegendColor(theme);

  /** Shared legend label style applied to all custom legend entries */
  const labelProps = {
    hidden: false,
    lineWidth: 2,
    strokeStyle: legendColor,
    fillStyle: "rgba(0, 0, 0, 0)",
    fontColor: legendColor,
  };

  /** Chart.js options controlling layout, legend, tooltip, and axis configuration */
  const options = {
    responsive: true,
    maintainAspectRatio: false,
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
              { text: "Frozen Water", lineDash: [3, 3], ...labelProps },
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
            return numValue % 5 === 0 ? numValue : "";
          },
        },
        grid: {
          color: gridColor,
          display: true,
          drawOnChartArea: true,
          lineWidth: function (context: ScriptableScaleContext) {
            return context.tick.value % 5 === 0 ? 1 : 0;
          },
        },
      },
      y: {
        min: -30,
        max: 0,
        ticks: { color: legendColor },
        title: { display: true, text: "Temperature (°C)", color: legendColor },
        grid: { color: gridColor },
      },
    },
  };

  return <Line data={graphData} options={options} />;
}
