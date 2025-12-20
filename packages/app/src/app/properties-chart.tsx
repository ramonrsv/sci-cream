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
} from "chart.js";

import { RecipeState, getMixTotal, calculateMixProperties } from "./recipe";
import { KeyFilter, QtyToggle, KeySelection, getEnabledKeys } from "../lib/ui/key-selection";
import { DEFAULT_SELECTED_PROPERTIES } from "./properties";
import { applyQtyToggle, formatCompositionValue } from "../lib/ui/comp-values";
import { STATE_VAL } from "../lib/util";

import {
  PropKey,
  getPropKeys as getPropKeysAll,
  isPropKeyQuantity,
} from "../lib/sci-cream/sci-cream";

import { CompKey, FpdKey, getMixProperty, prop_key_as_med_str_js } from "@workspace/sci-cream";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function getPropKeys(): PropKey[] {
  return getPropKeysAll().filter(
    (key) =>
      // These values make the scale hard to read in a chart
      key !== CompKey[CompKey.Water] && key !== FpdKey[FpdKey.HardnessAt14C]
  );
}

export function MixPropertiesChart({ recipeState }: { recipeState: RecipeState }) {
  const qtyToggleState = useState<QtyToggle>(QtyToggle.Percentage);
  const propsFilterState = useState<KeyFilter>(KeyFilter.Auto);
  const selectedPropsState = useState<Set<PropKey>>(DEFAULT_SELECTED_PROPERTIES);

  const isPropEmpty = (prop_key: PropKey) => {
    const prop_val = getMixProperty(mixProperties, prop_key);
    return prop_val === 0 || Number.isNaN(prop_val);
  };

  const getEnabledProps = () => {
    return getEnabledKeys(propsFilterState, selectedPropsState, getPropKeys, isPropEmpty);
  };

  const getPropertyValue = (prop_key: PropKey): number => {
    return (
      applyQtyToggle(
        getMixProperty(mixProperties, prop_key),
        mixTotal,
        mixTotal,
        qtyToggleState[STATE_VAL],
        isPropKeyQuantity(prop_key)
      ) || 0
    );
  };

  const mixTotal = getMixTotal(recipeState);
  const mixProperties = calculateMixProperties(recipeState);

  const enabledProps = getEnabledProps();
  const labels = enabledProps.map((prop_key) => prop_key_as_med_str_js(prop_key));
  const values = enabledProps.map((prop_key) => Math.abs(getPropertyValue(prop_key)));

  const chartData = {
    labels,
    datasets: [
      {
        label: "Recipe",
        data: values,
        backgroundColor: "rgba(59, 130, 246, 0.9)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 1,
        maxBarThickness: 40,
        categoryPercentage: 0.8,
        barPercentage: 0.8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: "Mix Properties Chart" },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return formatCompositionValue(context.parsed.y);
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: qtyToggleState[STATE_VAL] },
      },
    },
  };

  return (
    <div id="mix-properties-chart" className="relative w-full h-full bg-gray-100">
      <KeySelection
        keyFilterState={propsFilterState}
        selectedKeysState={selectedPropsState}
        getKeys={getPropKeys}
        key_as_med_str_js={prop_key_as_med_str_js}
      />
      <div className="border-gray-400 border-2 p-3 h-[calc(100%-36px)]">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
