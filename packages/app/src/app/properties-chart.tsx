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
import { applyQtyToggle, formatCompositionValue } from "../lib/ui/comp-values";
import { Color, getColor, getGridColor, getLegendColor } from "../lib/styles/colors";
import { DRAG_HANDLE_ICON_SIZE, GRAPH_TITLE_FONT_SIZE } from "./page";
import { Theme } from "@/lib/ui/theme-select";

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
export const DEFAULT_SELECTED_PROPERTIES: Set<PropKey> = new Set([
  compToPropKey(CompKey.MilkFat),
  compToPropKey(CompKey.TotalFats),
  compToPropKey(CompKey.MSNF),
  compToPropKey(CompKey.TotalSolids),
  compToPropKey(CompKey.Water),
  compToPropKey(CompKey.TotalSugars),
  compToPropKey(CompKey.StabilizersPerWater),
  compToPropKey(CompKey.POD),
  compToPropKey(CompKey.PACtotal),
  compToPropKey(CompKey.AbsPAC),
  fpdToPropKey(FpdKey.ServingTemp),
] as PropKey[]);

/** Forward to `getMixProperty` and modify some values to be more suitable for chart display */
export function getModifiedMixProperty(mixProperties: MixProperties, propKey: PropKey): number {
  const rawValue = getMixProperty(mixProperties, propKey);

  switch (propKey) {
    case fpdToPropKey(FpdKey.FPD):
    case fpdToPropKey(FpdKey.ServingTemp):
      return -rawValue;
    case compToPropKey(CompKey.AbsPAC):
      return rawValue / 2;
    case compToPropKey(CompKey.EmulsifiersPerFat):
    case compToPropKey(CompKey.StabilizersPerWater):
      return rawValue * 100;
    default:
      return rawValue;
  }
}

/** Forward to `prop_key_as_med_str` and modify some value to reflect `getModifiedMixProperty` */
export function propKeyAsModifiedMedStr(propKey: PropKey): string {
  const rawMedStr = prop_key_as_med_str(propKey);

  switch (propKey) {
    case fpdToPropKey(FpdKey.FPD):
    case fpdToPropKey(FpdKey.ServingTemp):
      return "-" + rawMedStr;
    case compToPropKey(CompKey.AbsPAC):
      return rawMedStr + " / 2";
    case compToPropKey(CompKey.EmulsifiersPerFat):
    case compToPropKey(CompKey.StabilizersPerWater):
      return rawMedStr + " * 100";
    default:
      return rawMedStr;
  }
}

export function MixPropertiesChart({
  recipes: allRecipes,
  theme,
}: {
  recipes: Recipe[];
  theme: Theme;
}) {
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
        getModifiedMixProperty(mixProperties, prop_key),
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
  const labels = enabledProps.map((prop_key) => propKeyAsModifiedMedStr(prop_key));

  const gridColor = getGridColor(theme);
  const legendColor = getLegendColor(theme);

  const chartData = {
    labels,
    datasets: recipes.map((recipe) => {
      const recipeColor =
        recipe.index === 0 ? getColor(Color.GraphGreen) : getColor(Color.GraphGray);

      return {
        label: recipe.name,
        data: enabledProps.map((prop_key) =>
          Math.abs(getPropertyValue(prop_key, recipe.mixProperties!, recipe.mixTotal!)),
        ),
        backgroundColor: recipeColor,
        borderColor: recipeColor,
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
      legend: { display: false, position: "top" as const, align: "center" as const },
      title: {
        display: true,
        text: "Mix Properties Chart",
        color: legendColor,
        font: { size: GRAPH_TITLE_FONT_SIZE },
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<"bar">) => {
            return formatCompositionValue(context.parsed.y ?? undefined);
          },
        },
      },
    },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: legendColor } },
      y: {
        beginAtZero: true,
        title: { display: true, text: qtyToggle, color: legendColor },
        grid: { color: gridColor },
        ticks: { color: legendColor },
      },
    },
  };

  return (
    <div id="mix-properties-chart" className="grid-component relative h-full w-full">
      <div className="flex items-center">
        <GripVertical size={DRAG_HANDLE_ICON_SIZE} className="drag-handle" />
        <KeySelection
          keyFilterState={propsFilterState}
          selectedKeysState={selectedPropsState}
          getKeys={getPropKeys}
          key_as_med_str={prop_key_as_med_str}
        />
      </div>
      <div className="component-inner-border h-[calc(100%-30px)] p-3">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
