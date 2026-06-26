"use client";

import { ReactNode } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartType,
  type ChartOptions,
  type LegendItem,
  type Plugin,
  type ScriptableContext,
  type TooltipItem,
} from "chart.js";

import { Recipe, RecipeSummary, isRecipeEmpty } from "@/lib/recipe";
import { useTheme } from "@/lib/theme";
import {
  KeyFilter,
  KeyFilterSelect,
  getEnabledKeys,
  useKeyFilterState,
} from "@/app/_elements/selects/key-filter-select";
import { QtyToggle } from "@/app/_elements/selects/qty-toggle-select";
import { useOrderKeys } from "@/lib/group-by";
import { applyQtyToggle, formatCompositionValue } from "@/lib/comp-value-format";
import { prefersReducedMotion } from "@/lib/styles/motion";
import {
  CHART_TOP_PADDING,
  TOOLTIP_CORNER_RADIUS,
  TOOLTIP_PADDING,
  TOOLTIP_BORDER_WIDTH,
  TOOLTIP_BODY_FONT,
} from "@/lib/styles/sizes";
import { STATE_VAL } from "@/lib/util";
import {
  Color,
  ThemeColor,
  getColor,
  getRangeColor,
  addOrUpdateAlpha,
  RANGE_BAND_ALPHA,
  NO_RANGE_GRAY_ALPHA,
  REFERENCE_TICK_ALPHA,
  BAR_GRADIENT_TOP_ALPHA,
} from "@/lib/styles/colors";

import { DEFAULT_SELECTED_PROPERTIES, makeAutoHeuristicFunction } from "@/lib/sci-cream/sci-cream";

import {
  CompKey,
  RatioKey,
  FpdKey,
  PropKey,
  compToPropKey,
  ratioToPropKey,
  fpdToPropKey,
  getMixProperty,
  getMixScopePropKeys,
  getAcceptablePropertyRange,
  isPropKeyQuantity,
  groupEnabledKeys,
  MixProperties,
  prop_key_as_short_str,
  prop_key_as_med_str,
} from "@workspace/sci-cream";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/** A vertical band marking the acceptable range for one property, in chart (modified) units. */
type BandRange = { yMin: number; yMax: number } | null;

/**
 * A reference recipe rendered as horizontal tick markers across the bars. `values` is aligned to
 * the chart's labels (one entry per property), `null` where the reference lacks a usable value.
 */
interface RefMarker {
  label: string;
  color: string;
  dash: number[];
  values: (number | null)[];
}

/** Per-instance options the {@link rangeMeterPlugin} reads from `options.plugins.rangeMeter`. */
interface RangeMeterOptions {
  bandRanges: BandRange[];
  bandColor: string;
  refMarkers: RefMarker[];
}

declare module "chart.js" {
  // The `TType` parameter is unused here but must mirror the augmented interface's signature.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface PluginOptionsByType<TType extends ChartType> {
    rangeMeter?: RangeMeterOptions;
  }
}

/** Corner radius (px) for the acceptable-range band rectangles. */
const BAND_CORNER_RADIUS = 6;
/** Band width as a multiple of the bar width, so the band frames the bar. */
const BAND_WIDTH_FACTOR = 1.5;
/** Reference tick overhang (px) past each side of the bar, so a tick reads over the bar. */
const REF_TICK_OVERHANG = 2;
/** Line width (px) of a reference tick marker. */
const REF_TICK_WIDTH = 2;

/** Top corner radius (px) for the main recipe bars. */
const BAR_CORNER_RADIUS = 6;
/** Maximum bar thickness (px), so bars don't grow unwieldy with few categories. */
const MAX_BAR_THICKNESS = 48;
/** Fraction of each category slot occupied by its bar group (Chart.js `categoryPercentage`). */
const BAR_CATEGORY_PERCENTAGE = 0.8;
/** Fraction of the category-group width occupied by the bar itself (Chart.js `barPercentage`). */
const BAR_PERCENTAGE = 0.72;
/** Round the y-axis max up to the next multiple of this for clean tick labels plus headroom. */
const Y_AXIS_TICK_STEP = 5;

/** Clip subsequent canvas drawing to the chart's plot area. */
function clipToChartArea(
  ctx: CanvasRenderingContext2D,
  area: { left: number; top: number; right: number; bottom: number },
): void {
  ctx.beginPath();
  ctx.rect(area.left, area.top, area.right - area.left, area.bottom - area.top);
  ctx.clip();
}

/**
 * Draws the signature range-meter overlay: a soft acceptable-range band behind each bar
 * (`beforeDatasetsDraw`) and the reference recipes as horizontal tick markers on top of the bars
 * (`afterDatasetsDraw`). Geometry comes from the main bar elements, so bands and ticks track the
 * bars exactly. Reads its data from `options.plugins.rangeMeter`.
 */
const rangeMeterPlugin: Plugin<"bar", RangeMeterOptions> = {
  id: "rangeMeter",

  beforeDatasetsDraw(chart, _args, options) {
    if (!options?.bandRanges) return;

    const { ctx, chartArea } = chart;
    const meta = chart.getDatasetMeta(0);
    const y = chart.scales.y;

    ctx.save();
    clipToChartArea(ctx, chartArea);
    ctx.fillStyle = options.bandColor;

    options.bandRanges.forEach((range, i) => {
      const el = meta.data[i];
      if (!range || !el) return;

      const { x: cx, width } = el.getProps(["x", "width"], true) as { x: number; width: number };
      const bandWidth = width * BAND_WIDTH_FACTOR;
      const half = bandWidth / 2;
      const top = y.getPixelForValue(range.yMax);
      const height = y.getPixelForValue(range.yMin) - top;
      const radius = Math.min(BAND_CORNER_RADIUS, half, Math.abs(height) / 2);

      ctx.beginPath();
      ctx.roundRect(cx - half, top, bandWidth, height, radius);
      ctx.fill();
    });

    ctx.restore();
  },

  afterDatasetsDraw(chart, _args, options) {
    if (!options?.refMarkers?.length) return;

    const { ctx, chartArea } = chart;
    const meta = chart.getDatasetMeta(0);
    const y = chart.scales.y;

    ctx.save();
    clipToChartArea(ctx, chartArea);
    ctx.lineWidth = REF_TICK_WIDTH;

    options.refMarkers.forEach((ref) => {
      ctx.strokeStyle = ref.color;
      ctx.setLineDash(ref.dash);

      ref.values.forEach((value, i) => {
        const el = meta.data[i];
        if (value === null || !el) return;
        const py = y.getPixelForValue(value);
        if (py < chartArea.top || py > chartArea.bottom) return;

        const { x: cx, width } = el.getProps(["x", "width"], true) as { x: number; width: number };
        const half = width / 2 + REF_TICK_OVERHANG;

        ctx.beginPath();
        ctx.moveTo(cx - half, py);
        ctx.lineTo(cx + half, py);
        ctx.stroke();
      });
    });

    ctx.restore();
  },
};

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
    case compToPropKey(CompKey.Water):
    case ratioToPropKey(RatioKey.AbsPAC):
    case fpdToPropKey(FpdKey.HardnessAt14C):
      return rawValue / 2;
    case ratioToPropKey(RatioKey.AbsNetPAC):
      return rawValue / 3;
    case compToPropKey(CompKey.EggSNF):
    case compToPropKey(CompKey.Alcohol):
    case ratioToPropKey(RatioKey.EmulsifiersPerFat):
      return rawValue * 10;
    case compToPropKey(CompKey.Salt):
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
    case compToPropKey(CompKey.Water):
    case ratioToPropKey(RatioKey.AbsPAC):
    case fpdToPropKey(FpdKey.HardnessAt14C):
      return rawStr + " / 2";
    case ratioToPropKey(RatioKey.AbsNetPAC):
      return rawStr + " / 3";
    case compToPropKey(CompKey.EggSNF):
    case compToPropKey(CompKey.Alcohol):
    case ratioToPropKey(RatioKey.EmulsifiersPerFat):
      return rawStr + " * 10";
    case compToPropKey(CompKey.Salt):
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
 * for the chart's range band, `{ yMin: number; yMax: number }`, and may do additional
 * modifications such as inverting the range for FPD and ServingTemp to match their negation.
 */
export function getModifiedAcceptablePropertyRange(propKey: PropKey): BandRange {
  const sciRange = getAcceptablePropertyRange(propKey);
  if (!sciRange) return null;
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
 * Bare bar chart displaying key mix property values. Each property is a vertical range-meter: a
 * soft acceptable-range band sits behind a single status-colored bar for the main recipe (colored
 * by where its value sits in the range), and each reference recipe is drawn as a horizontal tick
 * marker across the bar at its own value.
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
  // Subscribe to the theme so the canvas re-reads the cascaded colors and repaints when it flips.
  useTheme();

  const gridColor = getColor(ThemeColor.Border);
  const legendColor = getColor(ThemeColor.TextPrimary);
  const tickColor = getColor(ThemeColor.TextSecondary);
  const surfaceColor = getColor(ThemeColor.Surface);

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

  const mainColor = getColor(Color.GraphGreen);
  const noRangeBarColor = addOrUpdateAlpha(getColor(Color.GraphGray), NO_RANGE_GRAY_ALPHA);

  /** Per-bar base color: within-range status color, or a lighter gray when the key has no range. */
  const mainBarColors = propKeys.map((propKey) => {
    const val = getPropertyValue(propKey, main.mixProperties, main.mixTotal!);
    const range = getModifiedAcceptablePropertyRange(propKey);
    return !range ? noRangeBarColor : getMainBarColor(val, range);
  });

  const mainData = propKeys.map((propKey) =>
    getPropertyValue(propKey, main.mixProperties, main.mixTotal!),
  );

  /** Acceptable-range bands (chart units) per property, drawn behind the bars by the plugin. */
  const bandRanges: BandRange[] = propKeys.map((propKey) =>
    getModifiedAcceptablePropertyRange(propKey),
  );

  /** Soft tint for the acceptable-range band, matching WatcherCard's `.range-meter-band`. */
  const bandColor = addOrUpdateAlpha(mainColor, RANGE_BAND_ALPHA);

  /**
   * Reference recipes as tick markers: solid for the first, dashed for the second so they stay
   * distinguishable over the bars; zero/NaN values are dropped (`null`) so no tick is drawn.
   */
  const refMarkers: RefMarker[] = refs.map((ref, i) => ({
    label: ref.name || ref.id,
    color: addOrUpdateAlpha(legendColor, REFERENCE_TICK_ALPHA),
    dash: i === 0 ? [] : [4, 3],
    values: propKeys.map((propKey) => {
      const val = getPropertyValue(propKey, ref.mixProperties, ref.mixTotal!);
      return Number.isNaN(val) || val === 0 ? null : val;
    }),
  }));

  // Cap the y-axis on the tallest drawn element, not just the bars: range bands and reference
  // ticks can rise above the bar values, and Chart.js's auto-scale (bar-data only) would clip
  // their tops. Round up to the next Y_AXIS_TICK_STEP for clean tick labels plus a little headroom.
  const drawnValues = [
    ...mainData,
    ...bandRanges.flatMap((range) => (range ? [range.yMax] : [])),
    ...refMarkers.flatMap((ref) => ref.values),
  ].filter((value): value is number => value !== null && Number.isFinite(value));

  const yMax =
    drawnValues.length > 0
      ? Math.ceil(Math.max(...drawnValues) / Y_AXIS_TICK_STEP) * Y_AXIS_TICK_STEP
      : undefined;

  /** Chart.js dataset: a single status-colored bar per property for the main recipe. */
  const chartData = {
    labels,
    datasets: [
      {
        // Stable dataset identity for react-chartjs-2: keying on `main.id` (the slot id) rather
        // than the default `label` keeps chart from re-animating the bars with every name edit.
        id: main.id,
        label: main.name || main.id,
        data: mainData,
        backgroundColor: (ctx: ScriptableContext<"bar">) => {
          const color = mainBarColors[ctx.dataIndex] ?? mainColor;
          const area = ctx.chart.chartArea;
          if (!area) return color;

          const gradient = ctx.chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
          gradient.addColorStop(0, addOrUpdateAlpha(color, BAR_GRADIENT_TOP_ALPHA));
          gradient.addColorStop(1, color);
          return gradient;
        },
        borderRadius: {
          topLeft: BAR_CORNER_RADIUS,
          topRight: BAR_CORNER_RADIUS,
          bottomLeft: 0,
          bottomRight: 0,
        },
        borderWidth: 0,
        maxBarThickness: MAX_BAR_THICKNESS,
        categoryPercentage: BAR_CATEGORY_PERCENTAGE,
        barPercentage: BAR_PERCENTAGE,
      },
    ],
  };

  /** Legend entries: a filled chip for the main recipe and a line swatch per reference. */
  const legendLabels: LegendItem[] = [
    {
      text: main.name || main.id,
      fillStyle: mainColor,
      strokeStyle: mainColor,
      lineWidth: 0,
      fontColor: legendColor,
      hidden: false,
    },
    ...refMarkers.map((ref) => ({
      text: ref.label,
      fillStyle: "rgba(0, 0, 0, 0)",
      strokeStyle: ref.color,
      lineWidth: 2,
      lineDash: ref.dash,
      fontColor: legendColor,
      hidden: false,
    })),
  ];

  /** Chart.js options controlling layout, legend, tooltip, axis, and the range-meter overlay. */
  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    // Disable the canvas entry/resize animation under reduced motion so screenshots are stable.
    animation: prefersReducedMotion() ? false : undefined,
    // No chart title: the panel context already names the chart, and dropping it reclaims height.
    layout: { padding: { top: CHART_TOP_PADDING } },
    plugins: {
      rangeMeter: { bandRanges, bandColor, refMarkers },
      legend: {
        display: refs.length > 0,
        position: "chartArea",
        align: "start",
        onClick: () => undefined,
        labels: { color: legendColor, generateLabels: () => legendLabels },
      },
      tooltip: {
        backgroundColor: surfaceColor,
        borderColor: gridColor,
        borderWidth: TOOLTIP_BORDER_WIDTH,
        titleColor: legendColor,
        bodyColor: legendColor,
        cornerRadius: TOOLTIP_CORNER_RADIUS,
        padding: TOOLTIP_PADDING,
        bodyFont: { family: TOOLTIP_BODY_FONT },
        callbacks: {
          title: (items: TooltipItem<"bar">[]) => items[0]?.label ?? "",
          label: (context: TooltipItem<"bar">) =>
            `${main.name || main.id}: ${formatCompositionValue(context.parsed.y ?? undefined).trim()}`,
          afterBody: (items: TooltipItem<"bar">[]) => {
            const idx = items[0]?.dataIndex;
            if (idx === undefined) return [];

            return refMarkers.flatMap((ref) => {
              const val = ref.values[idx];
              return val === null ? [] : [`${ref.label}: ${formatCompositionValue(val).trim()}`];
            });
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: tickColor } },
      y: {
        beginAtZero: true,
        max: yMax,
        title: { display: true, text: qtyToggle, color: tickColor },
        grid: { color: gridColor },
        border: { display: false },
        ticks: { color: tickColor },
      },
    },
  };

  return <Bar data={chartData} options={options} plugins={[rangeMeterPlugin]} datasetIdKey="id" />;
}

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
  persistKey,
}: {
  main: Recipe;
  refs?: RecipeSummary[];
  toolbarPrefix?: ReactNode;
  defaultSelected?: Set<PropKey>;
  persistKey?: string;
}) {
  const {
    keyFilterState: propsFilterState,
    selectedKeysState: selectedPropsState,
    supportedKeyFilters,
  } = useKeyFilterState(persistKey, {
    defaultSelected,
    getKeys: getMixScopePropKeys,
    supportedKeyFilters: [KeyFilter.Auto, KeyFilter.Custom],
  });

  const orderKeys = useOrderKeys<PropKey>(groupEnabledKeys);

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

  /**
   * Auto-filter heuristic: returns all active keys from `DEFAULT_SELECTED_PROPERTIES`.
   *
   * A key is active if it has a non-zero value in any reference recipe, or any ingredient in the
   * main recipe; see {@link makeAutoHeuristicFunction}. Kept in sync with {@link WatchersView}.
   */
  const autoHeuristic = makeAutoHeuristicFunction(main, refs);

  /** Returns the list of property keys to display, based on the current filter and selection */
  const getEnabledProps = () => {
    return getEnabledKeys(
      propsFilterState[STATE_VAL],
      selectedPropsState[STATE_VAL],
      getMixScopePropKeys,
      isPropEmpty,
      autoHeuristic,
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="toolbar">
        {toolbarPrefix}
        <KeyFilterSelect
          supportedKeyFilters={supportedKeyFilters}
          keyFilterState={propsFilterState}
          selectedKeysState={selectedPropsState}
          getKeys={getMixScopePropKeys}
          key_as_med_str={prop_key_as_med_str}
          orderKeys={orderKeys}
        />
      </div>
      <div className="min-h-0 flex-1 px-2 pb-2">
        <PropertiesBarChart main={main} refs={refs} propKeys={getEnabledProps()} />
      </div>
    </div>
  );
}
