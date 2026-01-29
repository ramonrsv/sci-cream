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
  type TooltipItem,
  type ScriptableScaleContext,
} from "chart.js";

import { Recipe, isRecipeEmpty } from "./recipe";
import { GRID_COLOR, recipeChartColor } from "@/lib/styles/colors";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export function FpdGraph({ recipes: allRecipes }: { recipes: Recipe[] }) {
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
      const borderColor = recipeChartColor(recipe.index);
      const recipeLabel = recipe.index === 0 ? "" : ` (${recipe.name})`;

      const lines = [
        { lineLabel: "Hardness", curve: curves.hardness },
        { lineLabel: "Frozen Water", borderDash: [3, 3], curve: curves.frozen_water },
      ];

      return lines.map(({ lineLabel, borderDash, curve }) => ({
        label: `${lineLabel}${recipeLabel}`,
        data: curve.map((point) => (point.temp >= 0 ? NaN : point.temp)),
        backgroundColor: "rgba(0, 0, 0, 0)",
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

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
      title: { display: true, text: "FPD Graph" },
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
          autoSkip: false,
          callback: function (value: string | number) {
            const numValue = Number(value);
            return numValue % 5 === 0 ? numValue : "";
          },
        },
        grid: {
          color: GRID_COLOR,
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
        title: { display: true, text: "Temperature (°C)" },
        grid: { color: GRID_COLOR },
      },
    },
  };

  return (
    <div id="fpd-graph" className="grid-component relative h-full w-full">
      <div className="component-inner-border h-full p-3">
        <Line data={graphData} options={options} />
      </div>
    </div>
  );
}
