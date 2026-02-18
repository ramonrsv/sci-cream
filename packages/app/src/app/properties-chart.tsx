"use client";

import { useState } from "react";
import { GripVertical } from "lucide-react";
import { Chart } from "react-chartjs-2";
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

import {
  BarWithErrorBarsController,
  BarWithErrorBar,
  type IErrorBarYDataPoint,
} from "chartjs-chart-error-bars";

import { Recipe, isRecipeEmpty } from "@/app/recipe";
import { KeyFilter, KeyFilterSelect, getEnabledKeys } from "@/lib/ui/key-filter-select";
import { QtyToggle } from "@/lib/ui/qty-toggle-select";
import { applyQtyToggle, formatCompositionValue } from "@/lib/ui/comp-values";
import {
  Color,
  getColor,
  getGridColor,
  getLegendColor,
  getReferenceOpacity,
  addOrUpdateAlpha,
} from "@/lib/styles/colors";
import { DRAG_HANDLE_ICON_SIZE, GRAPH_TITLE_FONT_SIZE } from "@/lib/ui/constants";
import { Theme } from "@/lib/ui/theme-select";

import { isPropKeyQuantity, getAcceptablePropertyRange } from "@/lib/sci-cream/sci-cream";

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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  BarWithErrorBarsController,
  BarWithErrorBar,
);

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

/** Modify some property values to be more suitable for chart display
 *
 * For example, invert FPD and ServingTemp to be positive, convert AbsPAC to a smaller range,
 * convert emulsifier/stabilizer ratios to percentages, etc.
 */
export function modifyMixPropertyForChart(rawValue: number, propKey: PropKey): number {
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

/** Modify property key strings to match modifications done in `modifyMixPropertyForChart` */
export function modifyPropKeyAsMedStrForChart(rawMedStr: string, propKey: PropKey): string {
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

/** Forward to `getMixProperty` and `modifyMixPropertyForChart` */
export function getModifiedMixProperty(mixProperties: MixProperties, propKey: PropKey): number {
  return modifyMixPropertyForChart(getMixProperty(mixProperties, propKey), propKey);
}

/** Forward to `prop_key_as_med_str` and `modifyPropKeyAsMedStrForChart` */
export function propKeyAsModifiedMedStr(propKey: PropKey): string {
  return modifyPropKeyAsMedStrForChart(prop_key_as_med_str(propKey), propKey);
}

/** Modify acceptable property range to match modifications done in `modifyMixPropertyForChart`
 *
 * This function also maps the sci-cream range `{ min: number; max: number }` to the format needed
 * for error bars in the chart, `{ yMin: number; yMax: number }`, and may do additional
 * modifications such as inverting the range for FPD and ServingTemp to match their negation.
 */
export function getModifiedAcceptablePropertyRange(
  propKey: PropKey,
): { yMin: number; yMax: number } | undefined {
  const sciRange = getAcceptablePropertyRange(propKey);
  if (!sciRange) return undefined;
  let range: { yMin: number; yMax: number } = { yMin: sciRange.min, yMax: sciRange.max };

  switch (propKey) {
    // Invert max/min for FPD and ServingTemp since those property values are negated for display
    case fpdToPropKey(FpdKey.FPD):
    case fpdToPropKey(FpdKey.ServingTemp):
      range = { yMin: range.yMax, yMax: range.yMin };
  }

  return {
    yMin: modifyMixPropertyForChart(range.yMin, propKey),
    yMax: modifyMixPropertyForChart(range.yMax, propKey),
  };
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

  const getMainBarColor = (propVal: number, range: { yMin: number; yMax: number }): string => {
    const isWithin = (val: number, range: { yMin: number; yMax: number }) =>
      val > range.yMin && val < range.yMax;

    const idealRange = {
      yMin: range.yMin + (range.yMax - range.yMin) * 0.15,
      yMax: range.yMax - (range.yMax - range.yMin) * 0.15,
    };

    const expandedRange = {
      yMin: range.yMin - (range.yMax - range.yMin) * 0.15,
      yMax: range.yMax + (range.yMax - range.yMin) * 0.15,
    };

    return isWithin(propVal, idealRange)
      ? getColor(Color.GraphGreen)
      : isWithin(propVal, range)
        ? getColor(Color.GraphYellow)
        : isWithin(propVal, expandedRange)
          ? getColor(Color.GraphOrange)
          : getColor(Color.GraphRedDull);
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
      const isMain = recipe.index === 0;
      const mainColor = getColor(Color.GraphGreen);
      const grayColor = getColor(Color.GraphGray);
      const refOpacity = getReferenceOpacity(recipe.index - 1);

      const mainBarColors = enabledProps.map((prop_key) => {
        const val = getPropertyValue(prop_key, recipe.mixProperties!, recipe.mixTotal!);
        const range = getModifiedAcceptablePropertyRange(prop_key);
        return !range ? mainColor : getMainBarColor(val, range);
      });

      return {
        label: recipe.name,
        data: enabledProps.map(
          (prop_key) =>
            ({
              y: getPropertyValue(prop_key, recipe.mixProperties!, recipe.mixTotal!),
              ...(isMain ? getModifiedAcceptablePropertyRange(prop_key) : {}),
            }) as IErrorBarYDataPoint,
        ),
        backgroundColor: isMain ? mainBarColors! : addOrUpdateAlpha(grayColor, refOpacity),
        borderColor: isMain ? mainColor : addOrUpdateAlpha(grayColor, refOpacity + 0.2),
        borderWidth: isMain ? 0 : 1,
        borderRadius: 3,
        maxBarThickness: 40,
        categoryPercentage: 0.6,
        barPercentage: 0.8,
        errorBarLineWidth: isMain ? 2 : 0,
        errorBarColor: legendColor,
        errorBarWhiskerLineWidth: isMain ? 4 : 0,
        errorBarWhiskerColor: legendColor,
        errorBarWhiskerRatio: recipes.length === 1 ? 0.4 : recipes.length === 2 ? 0.6 : 1,
      };
    }),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: recipes.length > 1,
        position: "chartArea" as const,
        align: "start" as const,
        labels: { color: legendColor, usePointStyle: true, pointStyle: "rectRounded" },
        title: { display: true, padding: { top: 30 } },
      },
      title: {
        display: true,
        text: "Mix Properties Chart",
        color: legendColor,
        font: { size: GRAPH_TITLE_FONT_SIZE },
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<"barWithErrorBars">) => {
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
        <KeyFilterSelect
          supportedKeyFilters={[KeyFilter.Auto, KeyFilter.Custom]}
          keyFilterState={propsFilterState}
          selectedKeysState={selectedPropsState}
          getKeys={getPropKeys}
          key_as_med_str={prop_key_as_med_str}
        />
      </div>
      <div className="h-[calc(100%-33px)] px-2 pb-2">
        <Chart type="barWithErrorBars" data={chartData} options={options} />
      </div>
    </div>
  );
}
