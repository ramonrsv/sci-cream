"use client";

import { Line } from "react-chartjs-2";
import { GripVertical } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type TooltipItem,
  type ScriptableScaleContext,
} from "chart.js";

import { Recipe, isRecipeEmpty } from "./recipe";
import { getLegendColor, getGridColor, getRecipeChartColor } from "@/lib/styles/colors";
import { COMPONENT_ACTION_ICON_SIZE } from "./page";
import { Theme } from "@/lib/ui/theme-select";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export function FpdGraph({ recipes: allRecipes, theme }: { recipes: Recipe[]; theme: Theme }) {
  // Only display the main recipe and non-empty reference recipes
  const recipes = allRecipes.filter((recipe) => recipe.index == 0 || !isRecipeEmpty(recipe));

  // Highlight temperature at the ideal serving hardness
  const highlightedHardnessPercent = 75;

  const shouldHighlight = (lineLabel: string, pointIdx: number) => {
    return lineLabel === "Hardness" && pointIdx === highlightedHardnessPercent;
  };

  const graphData = {
    labels: Array.from({ length: 101 }, (_, i) => i),
    datasets: recipes.flatMap((recipe) => {
      const curves = recipe.mixProperties.fpd!.curves!;
      const borderColor = getRecipeChartColor(recipe.index);
      const recipeLabel = recipe.index === 0 ? "" : ` (${recipe.name})`;

      const lines = [
        { lineLabel: "Hardness", curve: curves.hardness },
        { lineLabel: "Frozen Water", borderDash: [3, 3], curve: curves.frozen_water },
      ];

      return lines.map(({ lineLabel, borderDash, curve }) => ({
        label: `${lineLabel}${recipeLabel}`,
        data: curve.map((point) => (point.temp >= 0 ? NaN : point.temp)),
        borderColor: borderColor,
        borderDash: borderDash,
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

  const labelProps = {
    hidden: false,
    lineWidth: 2,
    strokeStyle: legendColor,
    fillStyle: "rgba(0, 0, 0, 0)",
    fontColor: legendColor,
  };

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
      title: { display: true, text: "FPD Graph", color: legendColor },
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

  return (
    <div id="fpd-graph" className="grid-component relative h-full w-full">
      <div className="flex items-center">
        <GripVertical
          size={COMPONENT_ACTION_ICON_SIZE}
          className="drag-handle mx-0.75 mt-1 mb-0.75 cursor-move"
        />
      </div>
      <div className="component-inner-border h-[calc(100%-24px)] p-3">
        <Line data={graphData} options={options} />
      </div>
    </div>
  );
}
