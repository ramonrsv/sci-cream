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

  const graphData = {
    labels: Array.from({ length: 101 }, (_, i) => i),
    datasets: recipes.flatMap((recipe, idx) => {
      const lines = [
        { lineLabel: "Hardness", borderDash: [1, 1] },
        { lineLabel: "Frozen Water", borderDash: [5, 5] },
        { lineLabel: "HF", borderDash: [2, 2] },
      ];

      return lines.map(({ lineLabel, borderDash }, lineIdx) => ({
        label: lineLabel,
        data: Array.from({ length: 101 }).map((v, i) => -((30 / 95) * i) - idx * 3 - lineIdx * 4),
        backgroundColor: colorsByIdx[recipe.index].background,
        borderColor: colorsByIdx[recipe.index].border,
        borderDash: borderDash,
        pointRadius: 0,
      }));
    }),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true }, title: { display: true, text: "FPD Graph" } },
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
