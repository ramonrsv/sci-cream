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
} from "chart.js";

import { Recipe, isRecipeEmpty } from "./recipe";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export function FpdGraph({ recipes: allRecipes }: { recipes: Recipe[] }) {
  // Only display the main recipe and non-empty reference recipes
  const recipes = allRecipes.filter((recipe) => recipe.index == 0 || !isRecipeEmpty(recipe));

  const colorsByIdx = [
    { background: "rgba(59, 130, 246, 0.9)", border: "rgba(59, 130, 246, 1)" },
    { background: "rgba(220, 38, 38, 0.9)", border: "rgba(220, 38, 38, 1)" },
    { background: "rgba(234, 179, 8, 0.9)", border: "rgba(234, 179, 8, 1)" },
  ];

  // Highlight temperature at the ideal serving hardness
  const highlightedHardnessPercent = 75;

  const shouldHighlight = (lineLabel: string, pointIdx: number) => {
    return lineLabel === "Hardness" && pointIdx === highlightedHardnessPercent;
  };

  const graphData = {
    labels: Array.from({ length: 101 }, (_, i) => i),
    datasets: recipes.flatMap((recipe) => {
      const curves = recipe.mixProperties.fpd!.curves!;
      const backgroundColor = colorsByIdx[recipe.index].background;
      const borderColor = colorsByIdx[recipe.index].border;

      const lines = [
        { lineLabel: "Hardness", borderDash: [1, 1], curve: curves.hardness },
        { lineLabel: "Frozen Water", borderDash: [5, 5], curve: curves.frozen_water },
        { lineLabel: "HF", borderDash: [2, 2], curve: curves.hardness_factor },
      ];

      return lines.map(({ lineLabel, borderDash, curve }) => ({
        label: lineLabel,
        data: curve.map((point) => point.temp),
        backgroundColor: backgroundColor,
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
      },
      y: { min: -30, max: 0, title: { display: true, text: "Temperature (°C)" } },
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
