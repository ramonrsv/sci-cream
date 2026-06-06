"use client";

import { ReactNode, useState } from "react";
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

import { RecipeSummary, isRecipeEmpty } from "@/lib/recipe";
import { useTheme } from "@/lib/theme";
import {
  KeyFilter,
  KeyFilterSelect,
  getEnabledKeys,
} from "@/app/_elements/selects/key-filter-select";
import { QtyToggle } from "@/app/_elements/selects/qty-toggle-select";
import { applyQtyToggle, formatCompositionValue } from "@/lib/comp-value-format";
import { GRAPH_TITLE_FONT_SIZE } from "@/lib/styles/sizes";
import { STATE_VAL } from "@/lib/util";
import {
  Color,
  getColor,
  getGridColor,
  getLegendColor,
  getRangeColor,
  getReferenceOpacity,
  addOrUpdateAlpha,
} from "@/lib/styles/colors";

import {
  isPropKeyQuantity,
  isPropKeyMixScope,
  getAcceptablePropertyRange,
} from "@/lib/sci-cream/sci-cream";

import {
  CompKey,
  RatioKey,
  FpdKey,
  PropKey,
  compToPropKey,
  ratioToPropKey,
  fpdToPropKey,
  getPropKeys as getPropKeysAll,
  getMixProperty,
  MixProperties,
  prop_key_as_short_str,
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

/**
 * Returns all `PropKey` values suitable for chart display.
 *
 * Some property keys are excluded from the list because their values would make the scale difficult
 * to read, e.g. `PropKey.Water` and `FpdKey.HardnessAt14C`, whose values are in the ~50-80 range,
 * while most others top out at ~30. It also excludes ingredient-only ratio keys via
 * `isPropKeyMixScope` since they are not meaningful in the context of a mix composition chart.
 *
 * Keys are available for selection in the `KeyFilterSelect`.
 */
export function getPropKeys(): PropKey[] {
  return getPropKeysAll().filter(
    (key) =>
      isPropKeyMixScope(key) &&
      key !== compToPropKey(CompKey.Water) &&
      key !== fpdToPropKey(FpdKey.HardnessAt14C),
  );
}

/**
 * Modify some property values to be more suitable for chart display
 *
 * For example, invert FPD and ServingTemp to be positive, convert AbsPAC to a smaller range,
 * convert emulsifier/stabilizer ratios to percentages, etc.
 */
export function modifyMixPropertyForChart(rawValue: number, propKey: PropKey): number {
  switch (propKey) {
    case fpdToPropKey(FpdKey.FPD):
    case fpdToPropKey(FpdKey.ServingTemp):
      return -rawValue;
    case ratioToPropKey(RatioKey.AbsPAC):
      return rawValue / 2;
    case ratioToPropKey(RatioKey.EmulsifiersPerFat):
    case ratioToPropKey(RatioKey.StabilizersPerWater):
      return rawValue * 100;
    default:
      return rawValue;
  }
}

/** Modify property key strings to match modifications done in `modifyMixPropertyForChart` */
export function modifyPropKeyAsShortStrForChart(rawStr: string, propKey: PropKey): string {
  switch (propKey) {
    case fpdToPropKey(FpdKey.FPD):
    case fpdToPropKey(FpdKey.ServingTemp):
      return "-" + rawStr;
    case ratioToPropKey(RatioKey.AbsPAC):
      return rawStr + " / 2";
    case ratioToPropKey(RatioKey.EmulsifiersPerFat):
    case ratioToPropKey(RatioKey.StabilizersPerWater):
      return rawStr + " * 100";
    default:
      return rawStr;
  }
}

/** Forward to `getMixProperty` and `modifyMixPropertyForChart` */
export function getModifiedMixProperty(mixProperties: MixProperties, propKey: PropKey): number {
  return modifyMixPropertyForChart(getMixProperty(mixProperties, propKey), propKey);
}

/** Forward to `prop_key_as_short_str` and `modifyPropKeyAsMedStrForChart` */
export function propKeyAsModifiedShortStr(propKey: PropKey): string {
  return modifyPropKeyAsShortStrForChart(prop_key_as_short_str(propKey), propKey);
}

/**
 * Modify acceptable property range to match modifications done in `modifyMixPropertyForChart`
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
    case fpdToPropKey(FpdKey.FPD):
    case fpdToPropKey(FpdKey.ServingTemp):
      range = { yMin: range.yMax, yMax: range.yMin };
  }

  return {
    yMin: modifyMixPropertyForChart(range.yMin, propKey),
    yMax: modifyMixPropertyForChart(range.yMax, propKey),
  };
}

/**
 * Bare bar chart displaying key mix property values for the main recipe and zero or more
 * reference recipes, with acceptable-range error bars on the main recipe's bars and color coding
 * based on the position relative to the range.
 *
 * Consumer is responsible for sizing the chart via a parent container.
 */
export function PropertiesBarChart({
  main,
  refs = [],
  propKeys,
}: {
  main: RecipeSummary;
  refs?: RecipeSummary[];
  propKeys: PropKey[];
}) {
  const { theme } = useTheme();

  /** Always display properties as percentages in the chart */
  const qtyToggle = QtyToggle.Percentage;

  /** Returns the display-ready (modified + qty-toggled) numeric value for a property key */
  const getPropertyValue = (
    propKey: PropKey,
    mixProperties: MixProperties,
    mixTotal: number,
  ): number => {
    return (
      applyQtyToggle(
        getModifiedMixProperty(mixProperties, propKey),
        mixTotal,
        mixTotal,
        qtyToggle,
        isPropKeyQuantity(propKey),
      ) ?? 0
    );
  };

  /** Returns the bar color for the main recipe via the shared {@link getRangeColor} helper */
  const getMainBarColor = (propVal: number, range: { yMin: number; yMax: number }): string => {
    return getColor(getRangeColor(propVal, { min: range.yMin, max: range.yMax }));
  };

  const labels = propKeys.map((propKey) => propKeyAsModifiedShortStr(propKey));

  const gridColor = getGridColor(theme);
  const legendColor = getLegendColor(theme);

  /** All recipes in display order: main first, then refs */
  const allRecipes: { recipe: RecipeSummary; isMain: boolean; refIdx: number }[] = [
    { recipe: main, isMain: true, refIdx: -1 },
    ...refs.map((r, i) => ({ recipe: r, isMain: false, refIdx: i })),
  ];

  const totalRecipes = allRecipes.length;

  /** Chart.js dataset configuration built from the recipes' mix property values */
  const chartData = {
    labels,
    datasets: allRecipes.map(({ recipe, isMain, refIdx }) => {
      const mainColor = getColor(Color.GraphGreen);
      const grayColor = getColor(Color.GraphGray);
      const refOpacity = getReferenceOpacity(refIdx);

      const mainBarColors = propKeys.map((propKey) => {
        const val = getPropertyValue(propKey, recipe.mixProperties, recipe.mixTotal!);
        const range = getModifiedAcceptablePropertyRange(propKey);
        return !range ? mainColor : getMainBarColor(val, range);
      });

      return {
        // Stable identity for react-chartjs-2 dataset matching across renders. Using `recipe.id`
        // (slot id, e.g. "Recipe" / "Ref A") instead of relying on the default `label` keeps the
        // chart from treating live name edits as a brand-new dataset and re-animating the bars.
        id: recipe.id,
        label: recipe.name || recipe.id,
        data: propKeys.map(
          (propKey) =>
            ({
              y: getPropertyValue(propKey, recipe.mixProperties, recipe.mixTotal!),
              ...(isMain ? getModifiedAcceptablePropertyRange(propKey) : {}),
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
        errorBarWhiskerRatio: totalRecipes === 1 ? 0.4 : totalRecipes === 2 ? 0.6 : 1,
      };
    }),
  };

  /** Chart.js options controlling layout, legend, tooltip, and axis configuration */
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: refs.length > 0,
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

  return <Chart type="barWithErrorBars" data={chartData} options={options} datasetIdKey="id" />;
}

/** Default set of property keys shown when the Custom key filter is first initialized */
export const DEFAULT_SELECTED_PROPERTIES: Set<PropKey> = new Set([
  compToPropKey(CompKey.MilkFat),
  compToPropKey(CompKey.TotalFats),
  compToPropKey(CompKey.MSNF),
  compToPropKey(CompKey.TotalSolids),
  compToPropKey(CompKey.Water),
  compToPropKey(CompKey.TotalSugars),
  ratioToPropKey(RatioKey.StabilizersPerWater),
  compToPropKey(CompKey.POD),
  compToPropKey(CompKey.TotalPAC),
  ratioToPropKey(RatioKey.AbsPAC),
  fpdToPropKey(FpdKey.ServingTemp),
] as PropKey[]);

/**
 * Properties bar chart with an attached toolbar (KeyFilter) that owns its own toolbar state.
 *
 * `toolbarPrefix` is rendered inside the toolbar's flex row before the controls; used by the
 * panel wrapper to inject a drag handle without breaking the toolbar layout.
 */
export function PropertiesChartView({
  main,
  refs = [],
  toolbarPrefix,
  defaultSelected = DEFAULT_SELECTED_PROPERTIES,
}: {
  main: RecipeSummary;
  refs?: RecipeSummary[];
  toolbarPrefix?: ReactNode;
  defaultSelected?: Set<PropKey>;
}) {
  const propsFilterState = useState<KeyFilter>(KeyFilter.Auto);
  const selectedPropsState = useState<Set<PropKey>>(defaultSelected);

  /** Returns `true` when every recipe has a zero/NaN value for the given property key */
  const isPropEmpty = (propKey: PropKey) => {
    const recipes = [main, ...refs];
    if (recipes.every((r) => isRecipeEmpty(r))) return true;

    for (const recipe of recipes) {
      const propVal = getMixProperty(recipe.mixProperties, propKey);
      if (!(propVal === 0 || Number.isNaN(propVal))) {
        return false;
      }
    }
    return true;
  };

  /** Auto-filter heuristic: includes a property key when it is part of the default selection */
  const autoHeuristic = (propKey: PropKey) => defaultSelected.has(propKey);

  /** Returns the list of property keys to display, based on the current filter and selection */
  const getEnabledProps = () => {
    return getEnabledKeys(
      propsFilterState[STATE_VAL],
      selectedPropsState[STATE_VAL],
      getPropKeys,
      isPropEmpty,
      autoHeuristic,
    );
  };

  return (
    <>
      <div className="flex items-center">
        {toolbarPrefix}
        <KeyFilterSelect
          supportedKeyFilters={[KeyFilter.Auto, KeyFilter.Custom]}
          keyFilterState={propsFilterState}
          selectedKeysState={selectedPropsState}
          getKeys={getPropKeys}
          key_as_med_str={prop_key_as_med_str}
        />
      </div>
      <div className="h-[calc(100%-33px)] px-2 pb-2">
        <PropertiesBarChart main={main} refs={refs} propKeys={getEnabledProps()} />
      </div>
    </>
  );
}
