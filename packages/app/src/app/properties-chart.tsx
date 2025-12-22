"use client";

import { useState } from "react";
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

import { RecipeState, getMixTotal, calculateMixProperties } from "./recipe";
import { KeyFilter, QtyToggle, KeySelection, getEnabledKeys } from "../lib/ui/key-selection";
import { DEFAULT_SELECTED_PROPERTIES } from "./properties";
import { applyQtyToggle, formatCompositionValue } from "../lib/ui/comp-values";

import {
  PropKey,
  getPropKeys as getPropKeysAll,
  isPropKeyQuantity,
} from "../lib/sci-cream/sci-cream";

import {
  CompKey,
  FpdKey,
  getMixProperty,
  MixProperties,
  prop_key_as_med_str_js,
} from "@workspace/sci-cream";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function getPropKeys(): PropKey[] {
  return getPropKeysAll().filter(
    (key) =>
      // These values make the scale hard to read in a chart
      key !== CompKey[CompKey.Water] && key !== FpdKey[FpdKey.HardnessAt14C],
  );
}

export function MixPropertiesChart({ recipeStates }: { recipeStates: RecipeState[] }) {
  const propsFilterState = useState<KeyFilter>(KeyFilter.Auto);
  const selectedPropsState = useState<Set<PropKey>>(DEFAULT_SELECTED_PROPERTIES);

  const qtyToggle = QtyToggle.Percentage;

  const isPropEmpty = (prop_key: PropKey) => {
    for (const { mixProperties } of nonEmptyRecipes) {
      const prop_val = getMixProperty(mixProperties, prop_key);
      if (!(prop_val === 0 || Number.isNaN(prop_val))) {
        return false;
      }
    }
    return true;
  };

  const getEnabledProps = () => {
    return getEnabledKeys(propsFilterState, selectedPropsState, getPropKeys, isPropEmpty);
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
      ) || 0
    );
  };

  const nonEmptyRecipes = recipeStates
    .map((recipeState, index) => {
      return {
        recipeIdx: index,
        mixTotal: getMixTotal(recipeState) || 0,
        mixProperties: calculateMixProperties(recipeState),
      };
    })
    .filter(({ recipeIdx, mixTotal }) => recipeIdx == 0 || mixTotal > 0);

  const enabledProps = getEnabledProps();
  const labels = enabledProps.map((prop_key) => prop_key_as_med_str_js(prop_key));

  const colorsByIdx = [
    { background: "rgba(59, 130, 246, 0.9)", border: "rgba(59, 130, 246, 1)" },
    { background: "rgba(220, 38, 38, 0.9)", border: "rgba(220, 38, 38, 1)" },
    { background: "rgba(234, 179, 8, 0.9)", border: "rgba(234, 179, 8, 1)" },
  ];

  const chartData = {
    labels,
    datasets: nonEmptyRecipes.map(({ recipeIdx, mixTotal, mixProperties }) => {
      return {
        label: recipeIdx == 0 ? "Recipe" : `Ref ${recipeIdx}`,
        data: enabledProps.map((prop_key) =>
          Math.abs(getPropertyValue(prop_key, mixProperties, mixTotal)),
        ),
        backgroundColor: colorsByIdx[recipeIdx].background,
        borderColor: colorsByIdx[recipeIdx].border,
        borderWidth: 1,
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
    scales: { y: { beginAtZero: true, title: { display: true, text: qtyToggle } } },
  };

  return (
    <div id="mix-properties-chart" className="grid-component relative h-full w-full">
      <KeySelection
        keyFilterState={propsFilterState}
        selectedKeysState={selectedPropsState}
        getKeys={getPropKeys}
        key_as_med_str_js={prop_key_as_med_str_js}
      />
      <div className="component-inner-border h-[calc(100%-36px)] p-3">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
