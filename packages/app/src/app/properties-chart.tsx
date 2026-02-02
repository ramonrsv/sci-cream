"use client";

import { useState } from "react";
import { GripVertical } from "lucide-react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type TooltipItem,
} from "chart.js";

import { Recipe, isRecipeEmpty } from "./recipe";
import { KeyFilter, QtyToggle, KeySelection, getEnabledKeys } from "../lib/ui/key-selection";
import { DEFAULT_SELECTED_PROPERTIES } from "./properties";
import { applyQtyToggle, formatCompositionValue } from "../lib/ui/comp-values";
import { GRID_COLOR, recipeChartColor } from "../lib/styles/colors";
import { COMPONENT_ACTION_ICON_SIZE } from "./page";

import { isPropKeyQuantity } from "../lib/sci-cream/sci-cream";

import {
  CompKey,
  FpdKey,
  PropKey,
  compToPropKey,
  fpdToPropKey,
  getPropKeys as getPropKeysAll,
  getMixProperty,
  MixProperties,
  prop_key_as_med_str,
} from "@workspace/sci-cream";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export function getPropKeys(): PropKey[] {
  return getPropKeysAll().filter(
    (key) =>
      // These values make the scale hard to read in a chart
      key !== compToPropKey(CompKey.Water) && key !== fpdToPropKey(FpdKey.HardnessAt14C),
  );
}

export function MixPropertiesChart({ recipes: allRecipes }: { recipes: Recipe[] }) {
  const propsFilterState = useState<KeyFilter>(KeyFilter.Auto);
  const selectedPropsState = useState<Set<PropKey>>(DEFAULT_SELECTED_PROPERTIES);

  const qtyToggle = QtyToggle.Percentage;

  const isPropEmpty = (prop_key: PropKey) => {
    for (const recipe of recipes) {
      const prop_val = getMixProperty(recipe.mixProperties!, prop_key);
      if (!(prop_val === 0 || Number.isNaN(prop_val))) {
        return false;
      }
    }
    return true;
  };

  const autoHeuristic = (prop_key: PropKey) => {
    return DEFAULT_SELECTED_PROPERTIES.has(prop_key);
  };

  const getEnabledProps = () => {
    return getEnabledKeys(
      propsFilterState,
      selectedPropsState,
      getPropKeys,
      isPropEmpty,
      autoHeuristic,
    );
  };

  const getPropertyValue = (
    prop_key: PropKey,
    mixProperties: MixProperties,
    mixTotal: number,
  ): number => {
    return (
      applyQtyToggle(
        getMixProperty(mixProperties, prop_key),
        mixTotal,
        mixTotal,
        qtyToggle,
        isPropKeyQuantity(prop_key),
      ) ?? 0
    );
  };

  // Only display the main recipe and non-empty reference recipes
  const recipes = allRecipes.filter((recipe) => recipe.index == 0 || !isRecipeEmpty(recipe));

  const enabledProps = getEnabledProps();
  const labels = enabledProps.map((prop_key) => prop_key_as_med_str(prop_key));

  const chartData = {
    labels,
    datasets: recipes.map((recipe) => {
      return {
        label: recipe.name,
        data: enabledProps.map((prop_key) =>
          Math.abs(getPropertyValue(prop_key, recipe.mixProperties!, recipe.mixTotal!)),
        ),
        backgroundColor: recipeChartColor(recipe.index),
        borderColor: recipeChartColor(recipe.index),
        maxBarThickness: 40,
        categoryPercentage: 0.6,
        barPercentage: 0.8,
      };
    }),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
      title: { display: true, text: "Mix Properties Chart" },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<"bar">) => {
            return formatCompositionValue(context.parsed.y ?? undefined);
          },
        },
      },
    },
    scales: {
      x: { grid: { color: GRID_COLOR } },
      y: {
        beginAtZero: true,
        title: { display: true, text: qtyToggle },
        grid: { color: GRID_COLOR },
      },
    },
  };

  return (
    <div id="mix-properties-chart" className="grid-component relative h-full w-full">
      <div className="flex items-center">
        <GripVertical
          size={COMPONENT_ACTION_ICON_SIZE}
          className="drag-handle mx-0.75 mt-px cursor-move"
        />
        <KeySelection
          keyFilterState={propsFilterState}
          selectedKeysState={selectedPropsState}
          getKeys={getPropKeys}
          key_as_med_str={prop_key_as_med_str}
        />
      </div>
      <div className="component-inner-border h-[calc(100%-24px)] p-3">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
