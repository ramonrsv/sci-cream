import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";

import {
  Color,
  ThemeColor,
  getColor,
  addOrUpdateAlpha,
  NO_RANGE_GRAY_ALPHA,
  REFERENCE_TICK_ALPHA,
} from "@/lib/styles/colors";
import { PropertiesBarChart, PropertiesChartView } from "@/app/_elements/charts/properties-chart";
import { computeMeterDomain, valueToMeterPct } from "@/app/_elements/range-meter";
import { NormMode, NORM_MODE_SHORT_LABELS } from "@/app/_elements/selects/normalize-toggle-select";
import { ColorMode } from "@/app/_elements/selects/color-toggle-select";
import type { TargetsMap } from "@/app/_elements/watchers/watchers";
import { filterActiveSlots } from "@/lib/recipe";
import { KeyFilter } from "@/app/_elements/selects/key-filter-select";
import { QtyToggle } from "@/app/_elements/selects/qty-toggle-select";
import { applyQtyToggle, formatCompositionValue } from "@/lib/comp-value-format";
import { getSelectedOptionLabel } from "@/__tests__/unit/select";
import { UNCONDITIONAL_AUTO_PROPERTIES } from "@/lib/sci-cream/sci-cream";

import {
  CompKey,
  RatioKey,
  FpdKey,
  PropKey,
  MixProperties,
  compToPropKey,
  ratioToPropKey,
  fpdToPropKey,
  getMixProperty,
  getMixScopePropKeys,
  getAcceptablePropertyRange,
  isPropKeyQuantity,
  prop_key_as_short_str,
} from "@workspace/sci-cream";

import { STORAGE_KEYS } from "@/lib/local-storage";

import { RecipeID } from "@/__tests__/assets";
import {
  makeMockRecipeContext,
  getCompLabel,
  getPropIndex,
  configCustomKeysAll,
  setKeyFilterSelect,
  setNormModeSelect,
  setColorModeSelect,
} from "@/__tests__/unit/util";

vi.mock("chart.js", () => ({
  Chart: { register: vi.fn() },
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  BarElement: vi.fn(),
  PointElement: vi.fn(),
  LineElement: vi.fn(),
  Title: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
  Filler: vi.fn(),
}));

type ScriptableColor = (ctx: { dataIndex: number; chart: { chartArea?: unknown } }) => string;

interface TickMarkerOpts {
  label: string;
  color: string;
  dash: number[];
  values: (number | null)[];
  trueValues: (number | null)[];
}

interface RangeMeterOptions {
  bandRanges: ({ yMin: number; yMax: number } | null)[];
  bandColor: string;
  tickMarkers: TickMarkerOpts[];
  horizontal: boolean;
}

interface ScaleConfig {
  beginAtZero?: boolean;
  min?: number;
  max?: number;
  title?: { display: boolean; text: string };
  grid?: { display?: boolean; color?: string };
  ticks?: { display?: boolean; color?: string };
}

interface TooltipCtx {
  datasetIndex: number;
  dataIndex: number;
  label?: string;
}

interface TooltipConfig {
  filter?: (item: TooltipCtx) => boolean;
  callbacks: {
    title: (items: TooltipCtx[]) => string;
    label: (item: TooltipCtx) => string;
    labelColor: (item: TooltipCtx) => { backgroundColor: string; borderColor: string };
    afterBody: (items: TooltipCtx[]) => string[];
  };
}

interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  indexAxis?: "x" | "y";
  plugins: {
    rangeMeter: RangeMeterOptions;
    legend: { display: boolean };
    title?: { display: boolean; text: string };
    tooltip: TooltipConfig;
  };
  scales: { x: ScaleConfig; y: ScaleConfig };
}

interface CapturedChartProps {
  data: {
    labels: string[];
    datasets: Array<{
      id: string;
      label: string;
      data: number[];
      backgroundColor: string | ScriptableColor;
      maxBarThickness?: number;
      categoryPercentage?: number;
      barPercentage?: number;
    }>;
  };
  options: ChartOptions;
}

let capturedBarProps: CapturedChartProps | null = null;

vi.mock("react-chartjs-2", () => ({
  Bar: ({ data, options }: CapturedChartProps) => {
    capturedBarProps = { data, options };
    return <div data-testid="bar-chart">Mocked Bar Chart</div>;
  },
}));

// Drive the chart's orientation by controlling the measured container size. `null` (the default)
// leaves the chart at its unmeasured vertical orientation, matching production's first paint.
let mockSize: { width: number; height: number } | null = null;

vi.mock("@/lib/use-element-size", () => ({
  useElementSize: () => ({ ref: { current: null }, size: mockSize }),
}));

/**
 * The qty-toggled true (unnormalized) value the chart uses before normalizing, or `undefined` when
 * the property is absent or zero (`applyQtyToggle` returns `undefined` for an exact-zero value).
 */
function truePropValue(
  mixProps: MixProperties,
  mixTotal: number,
  propKey: PropKey,
): number | undefined {
  return applyQtyToggle(
    getMixProperty(mixProps, propKey),
    mixTotal,
    mixTotal,
    QtyToggle.Percentage,
    isPropKeyQuantity(propKey),
  );
}

/** Expected normalized (0–100) main bar height for a single-recipe render — mirrors the chart. */
function expectedMainNorm(mixProps: MixProperties, mixTotal: number, propKey: PropKey): number {
  const range = getAcceptablePropertyRange(propKey) ?? undefined;
  const value = truePropValue(mixProps, mixTotal, propKey);
  const domain = computeMeterDomain([range?.min, range?.max, value]);
  return domain === undefined || value === undefined || Number.isNaN(value)
    ? NaN
    : valueToMeterPct(value, domain);
}

/** Convenience: build active recipes from a mock context and render the bar chart with them */
function renderFromContext(
  recipeIds: RecipeID[],
  propKeys: PropKey[] = getMixScopePropKeys(),
  targets?: TargetsMap,
  normMode?: NormMode,
) {
  const recipeCtx = makeMockRecipeContext(recipeIds);
  const active = filterActiveSlots(recipeCtx.recipes);
  return {
    recipeCtx,
    ...render(
      <PropertiesBarChart
        main={active[0]}
        refs={active.slice(1)}
        propKeys={propKeys}
        targets={targets}
        normMode={normMode}
      />,
    ),
  };
}

// ---------------------------------------------------------------------------
// PropertiesBarChart
// ---------------------------------------------------------------------------

describe("PropertiesBarChart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedBarProps = null;
    mockSize = null;
    setupVitestCanvasMock();
  });

  afterEach(async () => {
    cleanup();
    await vi.waitFor(() => {}, { timeout: 100 });
  });

  // ---- Component Rendering --------------------------------------------------------------------

  describe("Component Rendering", () => {
    it("should render the component", () => {
      renderFromContext([]);
      expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    });
  });

  // ---- Dataset Composition --------------------------------------------------------------------

  describe("Dataset Composition", () => {
    it("should produce a single dataset for the main recipe only", () => {
      renderFromContext([]);
      expect(capturedBarProps).not.toBeNull();
      expect(capturedBarProps!.data.datasets).toHaveLength(1);
      expect(capturedBarProps!.data.datasets[0].label).toBe("Recipe");
    });

    it("should keep one main dataset and carry references as tick markers", () => {
      renderFromContext([RecipeID.Main, RecipeID.RefA, RecipeID.RefB]);
      expect(capturedBarProps!.data.datasets).toHaveLength(1);
      expect(capturedBarProps!.data.datasets[0].label).toBe("Recipe");
      const tickMarkers = capturedBarProps!.options.plugins.rangeMeter.tickMarkers;
      expect(tickMarkers.map((r) => r.label)).toEqual(["Ref A", "Ref B"]);
    });
  });

  // ---- Dataset Configuration ------------------------------------------------------------------

  describe("Dataset Configuration", () => {
    it("should configure datasets with correct bar styling", () => {
      renderFromContext([]);
      const dataset = capturedBarProps!.data.datasets[0];
      expect(dataset.maxBarThickness).toBe(48);
      expect(dataset.categoryPercentage).toBe(0.8);
      expect(dataset.barPercentage).toBe(0.72);
    });

    it("should set dataset colors for main recipe and reference recipes", () => {
      // Pick a range-bearing key and a range-less key to exercise both bar-color branches.
      const keys = getMixScopePropKeys();
      const rangeKey = keys.find((k) => getAcceptablePropertyRange(k))!;
      const noRangeKey = keys.find((k) => !getAcceptablePropertyRange(k))!;
      renderFromContext([RecipeID.Main, RecipeID.RefA, RecipeID.RefB], [rangeKey, noRangeKey]);

      const datasets = capturedBarProps!.data.datasets;
      // Single dataset: the main recipe, with a scriptable per-bar color.
      expect(datasets).toHaveLength(1);
      const bg = datasets[0].backgroundColor;
      expect(typeof bg).toBe("function");

      // Without a chartArea the scriptable returns the flat bar color; in jsdom every var resolves
      // to the same fallback, so we assert the applied alpha.
      const colorAt = (i: number) =>
        (bg as ScriptableColor)({ dataIndex: i, chart: { chartArea: undefined } });
      expect(colorAt(0)).toBe(getColor(Color.GraphGreen));
      expect(colorAt(1)).toBe(addOrUpdateAlpha(getColor(Color.GraphGray), NO_RANGE_GRAY_ALPHA));

      // References are tick markers, not datasets; solid first, dashed second.
      const expectedRefColor = addOrUpdateAlpha(
        getColor(ThemeColor.TextPrimary),
        REFERENCE_TICK_ALPHA,
      );
      const tickMarkers = capturedBarProps!.options.plugins.rangeMeter.tickMarkers;
      expect(tickMarkers).toHaveLength(2);
      expect(tickMarkers[0].color).toBe(expectedRefColor);
      expect(tickMarkers[0].dash).toEqual([]);
      expect(tickMarkers[1].color).toBe(expectedRefColor);
      expect(tickMarkers[1].dash).toEqual([4, 3]);
    });

    it("should normalize the main bar heights onto each property's own 0–100 track", () => {
      const propKeys: PropKey[] = [compToPropKey(CompKey.MSNF), ratioToPropKey(RatioKey.AbsPAC)];
      const { recipeCtx } = renderFromContext([RecipeID.Main], propKeys);
      const { mixProperties, mixTotal } = recipeCtx.recipes[0];
      const data = capturedBarProps!.data.datasets[0].data;

      expect(data).toHaveLength(propKeys.length);
      propKeys.forEach((key, i) => {
        const expected = expectedMainNorm(mixProperties!, mixTotal!, key);
        expect(data[i]).toBeCloseTo(expected);
        // Every drawn bar lands within the fixed normalized axis.
        expect(data[i]).toBeGreaterThanOrEqual(0);
        expect(data[i]).toBeLessThanOrEqual(100);
      });
    });

    it("should draw a normalized acceptable-range band only for keys that have a range", () => {
      const rangeKey = compToPropKey(CompKey.MSNF);
      const noRangeKey = getMixScopePropKeys().find((k) => !getAcceptablePropertyRange(k))!;
      const propKeys: PropKey[] = [rangeKey, noRangeKey];
      const { recipeCtx } = renderFromContext([RecipeID.Main], propKeys);
      const { mixProperties, mixTotal } = recipeCtx.recipes[0];

      const { bandRanges } = capturedBarProps!.options.plugins.rangeMeter;
      expect(bandRanges).toHaveLength(propKeys.length);

      // The range key's band is the acceptable range mapped into its normalized domain.
      const range = getAcceptablePropertyRange(rangeKey)!;
      const value = truePropValue(mixProperties!, mixTotal!, rangeKey);
      const domain = computeMeterDomain([range.min, range.max, value])!;
      expect(bandRanges[0]).not.toBeNull();
      expect(bandRanges[0]!.yMin).toBeCloseTo(valueToMeterPct(range.min, domain));
      expect(bandRanges[0]!.yMax).toBeCloseTo(valueToMeterPct(range.max, domain));
      expect(bandRanges[0]!.yMin).toBeLessThan(bandRanges[0]!.yMax);

      // The range-less key has no band.
      expect(bandRanges[1]).toBeNull();
    });
  });

  // ---- Target Markers -------------------------------------------------------------------------

  describe("Target Markers", () => {
    const MSNF = compToPropKey(CompKey.MSNF);
    const SALT = compToPropKey(CompKey.Salt);
    const ABS_PAC = ratioToPropKey(RatioKey.AbsPAC);

    it("should carry targets as a blue solid tick-marker series aligned to the labels", () => {
      renderFromContext([RecipeID.Main], [MSNF, SALT, ABS_PAC], { [MSNF]: 10, [SALT]: 0.2 });

      const tickMarkers = capturedBarProps!.options.plugins.rangeMeter.tickMarkers;
      expect(tickMarkers.map((m) => m.label)).toEqual(["Target"]);
      expect(tickMarkers[0].color).toBe(getColor(Color.GraphBlue));
      expect(tickMarkers[0].dash).toEqual([]);
      // trueValues carry the raw targets (no per-key scaling); keys without a target are null.
      expect(tickMarkers[0].trueValues).toEqual([10, 0.2, null]);
      // Drawn values are normalized: finite where a target exists, null otherwise.
      const values = tickMarkers[0].values;
      expect(values[0]).not.toBeNull();
      expect(values[1]).not.toBeNull();
      expect(values[2]).toBeNull();
      values.forEach((v) => {
        if (v !== null) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(100);
        }
      });
    });

    it("should draw the target series after (on top of) reference series", () => {
      renderFromContext([RecipeID.Main, RecipeID.RefA], [MSNF], { [MSNF]: 10 });
      const tickMarkers = capturedBarProps!.options.plugins.rangeMeter.tickMarkers;
      expect(tickMarkers.map((m) => m.label)).toEqual(["Ref A", "Target"]);
    });

    it("should keep a zero target and drop NaN targets", () => {
      renderFromContext([RecipeID.Main], [MSNF, SALT], { [MSNF]: 0, [SALT]: NaN });
      const tickMarkers = capturedBarProps!.options.plugins.rangeMeter.tickMarkers;
      expect(tickMarkers.map((m) => m.label)).toEqual(["Target"]);
      expect(tickMarkers[0].trueValues).toEqual([0, null]);
    });

    it("should not add a target series when no displayed key has a target", () => {
      renderFromContext([RecipeID.Main], [MSNF], { [SALT]: 0.2 });
      expect(capturedBarProps!.options.plugins.rangeMeter.tickMarkers).toHaveLength(0);
    });

    it("should display the legend when targets are present without references", () => {
      renderFromContext([RecipeID.Main], [MSNF], { [MSNF]: 10 });
      expect(capturedBarProps!.options.plugins.legend.display).toBe(true);
    });
  });

  // ---- Tooltip --------------------------------------------------------------------------------

  describe("Tooltip", () => {
    const MSNF = compToPropKey(CompKey.MSNF);

    it("adds the target as an invisible overlay dataset, second after the main recipe", () => {
      renderFromContext([RecipeID.Main], [MSNF], { [MSNF]: 10 });
      const datasets = capturedBarProps!.data.datasets;
      expect(datasets).toHaveLength(2);
      expect(datasets[0].label).toBe("Recipe");
      expect(datasets[1].id).toBe("target");
      // The overlay draws no bar; the visible tick is the rangeMeter plugin's job.
      expect(datasets[1].backgroundColor).toBe("transparent");
    });

    it("omits the target overlay dataset when no displayed key has a target", () => {
      renderFromContext([RecipeID.Main], [MSNF]);
      expect(capturedBarProps!.data.datasets).toHaveLength(1);
    });

    it("labels the target second with a blue color box, like the main recipe's box", () => {
      renderFromContext([RecipeID.Main], [MSNF], { [MSNF]: 10 });
      const { callbacks } = capturedBarProps!.options.plugins.tooltip;

      // Main recipe: body item 0, its own status-colored box.
      expect(callbacks.label({ datasetIndex: 0, dataIndex: 0 })).toContain("Recipe:");
      // Target: body item 1 (second), showing the true target value with a blue box.
      expect(callbacks.label({ datasetIndex: 1, dataIndex: 0 })).toBe(
        `Target: ${formatCompositionValue(10).trim()}`,
      );
      expect(callbacks.labelColor({ datasetIndex: 1, dataIndex: 0 }).backgroundColor).toBe(
        getColor(Color.GraphBlue),
      );
    });

    it("keeps references in afterBody (below the target), not the target itself", () => {
      renderFromContext([RecipeID.Main, RecipeID.RefA], [MSNF], { [MSNF]: 10 });
      const { callbacks } = capturedBarProps!.options.plugins.tooltip;
      const afterBody = callbacks.afterBody([{ datasetIndex: 0, dataIndex: 0 }]);
      expect(afterBody.some((line) => line.startsWith("Ref A:"))).toBe(true);
      expect(afterBody.some((line) => line.startsWith("Target:"))).toBe(false);
    });

    it("filters out the empty target item for a key without a target", () => {
      renderFromContext([RecipeID.Main], [MSNF], { [MSNF]: 10 });
      const { filter } = capturedBarProps!.options.plugins.tooltip;
      // A target exists at index 0, so the overlay item stays.
      expect(filter!({ datasetIndex: 1, dataIndex: 0 })).toBe(true);
    });
  });

  // ---- Normalization modes --------------------------------------------------------------------

  describe("Normalization modes", () => {
    const MSNF = compToPropKey(CompKey.MSNF);

    it("FullSpread (default) frames each property over the union of its points", () => {
      const { recipeCtx } = renderFromContext([RecipeID.Main], [MSNF], { [MSNF]: 10 });
      const { mixProperties, mixTotal } = recipeCtx.recipes[0];
      // The default matches the union-domain mirror used elsewhere.
      expect(capturedBarProps!.data.datasets[0].data[0]).toBeCloseTo(
        expectedMainNorm(mixProperties!, mixTotal!, MSNF),
      );
    });

    it("TargetCentered maps the target to the middle of the track (50%)", () => {
      renderFromContext([RecipeID.Main], [MSNF], { [MSNF]: 10 }, NormMode.TargetCentered);
      const target = capturedBarProps!.options.plugins.rangeMeter.tickMarkers.find(
        (m) => m.label === "Target",
      )!;
      expect(target.values[0]).toBeCloseTo(50);
    });

    it("ValueCentered maps the main value to the middle of the track (50%)", () => {
      renderFromContext([RecipeID.Main], [MSNF], undefined, NormMode.ValueCentered);
      expect(capturedBarProps!.data.datasets[0].data[0]).toBeCloseTo(50);
    });

    it("FillRange frames the acceptable range with symmetric padding on the track", () => {
      renderFromContext([RecipeID.Main], [MSNF], undefined, NormMode.FillRange);
      const band = capturedBarProps!.options.plugins.rangeMeter.bandRanges[0]!;
      // domain === range, so the band sits at the padded range edges regardless of the values.
      expect(band.yMin).toBeCloseTo(100 / 7);
      expect(band.yMax).toBeCloseTo(600 / 7);
    });
  });

  // ---- Chart Configuration --------------------------------------------------------------------

  describe("Chart Configuration", () => {
    it("should not display a chart title", () => {
      renderFromContext([]);
      expect(capturedBarProps!.options.plugins.title).toBeUndefined();
    });

    it("should configure chart with responsive and maintainAspectRatio settings", () => {
      renderFromContext([]);
      expect(capturedBarProps!.options.responsive).toBe(true);
      expect(capturedBarProps!.options.maintainAspectRatio).toBe(false);
    });

    it("should hide the legend when only the main recipe is shown", () => {
      renderFromContext([]);
      expect(capturedBarProps!.options.plugins.legend.display).toBe(false);
    });

    it("should span the fixed normalized 0–100 value axis with hidden, unlabeled ticks", () => {
      renderFromContext([]);
      const valueScale = capturedBarProps!.options.scales.y;
      expect(valueScale.beginAtZero).toBe(true);
      expect(valueScale.min).toBe(0);
      expect(valueScale.max).toBe(100);
      // The axis is per-property normalized, so its numbers are meaningless and left off.
      expect(valueScale.title).toBeUndefined();
      expect(valueScale.ticks!.display).toBe(false);
    });
  });

  // ---- Orientation -----------------------------------------------------------------------------

  describe("Orientation", () => {
    it("defaults to vertical bars (value axis on y) when unmeasured", () => {
      renderFromContext([RecipeID.Main]);
      expect(capturedBarProps!.options.indexAxis).toBe("x");
      expect(capturedBarProps!.options.plugins.rangeMeter.horizontal).toBe(false);
      // Value scale (normalized 0–100) sits on y; category scale (no such config) on x.
      expect(capturedBarProps!.options.scales.y.max).toBe(100);
      expect(capturedBarProps!.options.scales.y.ticks!.display).toBe(false);
      expect(capturedBarProps!.options.scales.x.max).toBeUndefined();
    });

    it("rotates to horizontal bars when the container is portrait", () => {
      mockSize = { width: 320, height: 560 };
      renderFromContext([RecipeID.Main]);
      expect(capturedBarProps!.options.indexAxis).toBe("y");
      expect(capturedBarProps!.options.plugins.rangeMeter.horizontal).toBe(true);
      // Orientation swaps the axis roles: the value scale moves to x, the category scale to y.
      expect(capturedBarProps!.options.scales.x.max).toBe(100);
      expect(capturedBarProps!.options.scales.x.ticks!.display).toBe(false);
      expect(capturedBarProps!.options.scales.y.max).toBeUndefined();
    });
  });

  // ---- Labels ----------------------------------------------------------------------------------

  describe("Labels", () => {
    it("should render a plain short-string label per provided propKey (no scale suffix)", () => {
      const propKeys: PropKey[] = [ratioToPropKey(RatioKey.AbsPAC), fpdToPropKey(FpdKey.FPD)];
      renderFromContext([], propKeys);
      expect(capturedBarProps!.data.labels).toEqual(propKeys.map(prop_key_as_short_str));
      // No normalization suffixes leak into the labels.
      capturedBarProps!.data.labels.forEach((label) => {
        expect(label).not.toMatch(/ [*/] \d/);
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Theme repaint (regression: charts must re-read cascaded colors on theme flip)
// ---------------------------------------------------------------------------

describe("PropertiesBarChart theme repaint", () => {
  const LIGHT_BORDER = "rgb(220, 220, 220)";
  const DARK_BORDER = "rgb(40, 40, 40)";

  let getComputedStyleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    capturedBarProps = null;
    mockSize = null;
    // Resolve --color-border to a value that depends on the root theme class, mimicking the CSS
    // cascade's `.dark` override so getColor reads a different value once the class flips.
    getComputedStyleSpy = vi
      .spyOn(window, "getComputedStyle")
      .mockImplementation(
        () =>
          ({
            getPropertyValue: (name: string) =>
              name === ThemeColor.Border
                ? document.documentElement.classList.contains("dark")
                  ? DARK_BORDER
                  : LIGHT_BORDER
                : "",
          }) as unknown as CSSStyleDeclaration,
      );
  });

  afterEach(() => {
    getComputedStyleSpy.mockRestore();
    document.documentElement.classList.remove("dark");
    cleanup();
  });

  // next-themes applies the `.dark` class in a post-commit effect, so the chart cannot rely on a
  // resolvedTheme subscription (it re-renders before the class lands). It must re-render off the
  // class mutation itself; here we flip the class directly and assert the grid color updates.
  it("re-reads cascaded colors when the root theme class changes", async () => {
    renderFromContext([]);
    expect(capturedBarProps!.options.scales.y.grid!.color).toBe(LIGHT_BORDER);

    act(() => {
      document.documentElement.classList.add("dark");
    });

    await waitFor(() => {
      expect(capturedBarProps!.options.scales.y.grid!.color).toBe(DARK_BORDER);
    });
  });
});

// ---------------------------------------------------------------------------
// PropertiesChartView (toolbar + bare)
// ---------------------------------------------------------------------------

describe("PropertiesChartView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedBarProps = null;
    mockSize = null;
    setupVitestCanvasMock();
  });

  afterEach(async () => {
    cleanup();
    await vi.waitFor(() => {}, { timeout: 100 });
  });

  /** Convenience: build active recipes from a mock context and render the view with them */
  function renderViewFromContext(recipeIds: RecipeID[]) {
    const recipeCtx = makeMockRecipeContext(recipeIds);
    const active = filterActiveSlots(recipeCtx.recipes);
    return {
      recipeCtx,
      ...render(<PropertiesChartView main={active[0]} refs={active.slice(1)} />),
    };
  }

  describe("Toolbar Rendering", () => {
    it("should render KeyFilterSelect", () => {
      const { container } = renderViewFromContext([RecipeID.Main]);
      expect(container.querySelector("#key-filter-select")).toBeInTheDocument();
    });

    it("should render the underlying bar chart", () => {
      const { container } = renderViewFromContext([RecipeID.Main]);
      expect(container.querySelector('[data-testid="bar-chart"]')).toBeInTheDocument();
    });

    it("should render NormModeSelect defaulting to Full Spread", () => {
      const { container } = renderViewFromContext([RecipeID.Main]);
      expect(container.querySelector("#normalize-toggle-select")).toBeInTheDocument();
      expect(getSelectedOptionLabel(container, "#normalize-toggle-select")).toBe(
        NORM_MODE_SHORT_LABELS[NormMode.FullSpread],
      );
    });
  });

  describe("Property Key Filtering", () => {
    it("should default to KeyFilter.Auto", () => {
      const { container } = renderViewFromContext([RecipeID.Main]);
      expect(getSelectedOptionLabel(container, "#key-filter-select")).toBe(KeyFilter.Auto);
    });

    it("should have some property keys selected by default", () => {
      renderViewFromContext([RecipeID.Main]);
      const labels = capturedBarProps!.data.labels;
      expect(labels.length).toBeGreaterThan(0);
      expect(labels).toContain(getCompLabel(CompKey.MilkFat));
    });

    it("should show all labels if explicitly selected", async () => {
      const { container } = renderViewFromContext([]);
      expect(capturedBarProps!.data.labels.length).toBeGreaterThan(0);

      await configCustomKeysAll(container);

      await waitFor(() => {
        expect(capturedBarProps!.data.labels.length).toBe(getMixScopePropKeys().length);
      });
    });

    it("Auto filter hides default keys that are inactive in the recipe", () => {
      renderViewFromContext([RecipeID.Main]);
      const labels = capturedBarProps!.data.labels;
      expect(labels).toContain(prop_key_as_short_str(compToPropKey(CompKey.MilkFat)));

      // NutSNF is a default key but inactive (no nuts in the main recipe), so it is filtered out.
      expect(labels).not.toContain(prop_key_as_short_str(compToPropKey(CompKey.NutSNF)));
    });

    it("Auto filter shows unconditional keys but no inactive keys for an empty recipe", () => {
      renderViewFromContext([]);
      const labels = capturedBarProps!.data.labels;
      for (const key of UNCONDITIONAL_AUTO_PROPERTIES) {
        expect(labels).toContain(prop_key_as_short_str(key));
      }
      // MilkFat is a default key, but inactive in an empty recipe and not unconditional.
      expect(labels).not.toContain(prop_key_as_short_str(compToPropKey(CompKey.MilkFat)));
    });
  });

  describe("Data Values", () => {
    it("should handle zero and NaN property values", async () => {
      const { container, recipeCtx } = renderViewFromContext([]);

      await configCustomKeysAll(container);

      const EmulsPerFatPropKey = ratioToPropKey(RatioKey.EmulsifiersPerFat);
      const AbsPACPropKey = ratioToPropKey(RatioKey.AbsPAC);
      const EmulsPerFatLabel = prop_key_as_short_str(EmulsPerFatPropKey);
      const AbsPACLabel = prop_key_as_short_str(AbsPACPropKey);

      const data = capturedBarProps!.data;
      await waitFor(() => expect(data.labels.length).toBe(getMixScopePropKeys().length));
      expect(data.labels).toContain(EmulsPerFatLabel);
      expect(data.labels).toContain(AbsPACLabel);

      const mixProps = recipeCtx.recipes[0].mixProperties!;
      expect(mixProps.composition.get_ratio(RatioKey.EmulsifiersPerFat)).toBeNaN();
      expect(mixProps.composition.get_ratio(RatioKey.AbsPAC)).toBe(0);
      expect(getMixProperty(mixProps, EmulsPerFatPropKey)).toBeNaN();
      expect(getMixProperty(mixProps, AbsPACPropKey)).toBe(0);

      // Neither draws a bar on an empty recipe: a NaN value is not drawable, and a zero value is
      // treated as absent (`undefined`) — both normalize to NaN, matching WatcherCard's meter.
      expect(data.datasets[0].data[getPropIndex(data.labels, EmulsPerFatPropKey)]).toBeNaN();
      expect(data.datasets[0].data[getPropIndex(data.labels, AbsPACPropKey)]).toBeNaN();
    });

    it("draws no bars for an empty recipe, leaving only the acceptable-range bands", () => {
      renderFromContext([]);
      // Every property is absent or zero on an empty recipe, so no bar is drawn.
      capturedBarProps!.data.datasets[0].data.forEach((v) => expect(v).toBeNaN());
      // Keys that carry an acceptable range still render their band.
      const { bandRanges } = capturedBarProps!.options.plugins.rangeMeter;
      expect(bandRanges.some((band) => band !== null)).toBe(true);
    });

    it("should normalize values and use plain (unscaled) labels", async () => {
      const { container, recipeCtx } = renderViewFromContext([RecipeID.Main]);

      await configCustomKeysAll(container);

      const data = capturedBarProps!.data;
      await waitFor(() => expect(data.labels.length).toBe(getMixScopePropKeys().length));

      const { mixProperties, mixTotal } = recipeCtx.recipes[0];
      for (const key of [
        ratioToPropKey(RatioKey.EmulsifiersPerFat),
        ratioToPropKey(RatioKey.StabilizersPerWater),
        ratioToPropKey(RatioKey.AbsPAC),
        fpdToPropKey(FpdKey.ServingTemp),
      ]) {
        expect(data.labels).toContain(prop_key_as_short_str(key));
        const actual = data.datasets[0].data[getPropIndex(data.labels, key)];
        const expected = expectedMainNorm(mixProperties!, mixTotal!, key);
        // An absent/zero property yields no bar (NaN); a real value normalizes onto its track.
        if (Number.isNaN(expected)) {
          expect(actual).toBeNaN();
        } else {
          expect(actual).toBeCloseTo(expected);
        }
      }
    });
  });

  // ---- Select persistence -----------------------------------------------------------------

  describe("Select persistence", () => {
    const FILTER_KEY = `${STORAGE_KEYS.propertiesChartPanelView}:filter`;
    const NORM_KEY = `${STORAGE_KEYS.propertiesChartPanelView}:norm`;
    const COLOR_KEY = `${STORAGE_KEYS.propertiesChartPanelView}:color`;

    beforeEach(() => {
      localStorage.clear();
    });

    it("writes the KeyFilter leaf key when the select changes", async () => {
      const recipeCtx = makeMockRecipeContext([]);
      const active = filterActiveSlots(recipeCtx.recipes);
      const { container } = render(
        <PropertiesChartView main={active[0]} persistKey={STORAGE_KEYS.propertiesChartPanelView} />,
      );
      await act(async () => {});

      await setKeyFilterSelect(container, KeyFilter.Custom);
      await act(async () => {});

      expect(localStorage.getItem(FILTER_KEY)).toBe(JSON.stringify(KeyFilter.Custom));
    });

    it("restores the KeyFilter value on remount", async () => {
      localStorage.setItem(FILTER_KEY, JSON.stringify(KeyFilter.Custom));
      const recipeCtx = makeMockRecipeContext([]);
      const active = filterActiveSlots(recipeCtx.recipes);
      const { container } = render(
        <PropertiesChartView main={active[0]} persistKey={STORAGE_KEYS.propertiesChartPanelView} />,
      );
      await act(async () => {});

      expect(getSelectedOptionLabel(container, "#key-filter-select")).toBe(KeyFilter.Custom);
    });

    it("writes the NormMode leaf key when the select changes", async () => {
      const recipeCtx = makeMockRecipeContext([]);
      const active = filterActiveSlots(recipeCtx.recipes);
      const { container } = render(
        <PropertiesChartView main={active[0]} persistKey={STORAGE_KEYS.propertiesChartPanelView} />,
      );
      await act(async () => {});

      await setNormModeSelect(container, NormMode.FillRange);
      await act(async () => {});

      expect(localStorage.getItem(NORM_KEY)).toBe(JSON.stringify(NormMode.FillRange));
    });

    it("restores the NormMode value on remount", async () => {
      localStorage.setItem(NORM_KEY, JSON.stringify(NormMode.TargetCentered));
      const recipeCtx = makeMockRecipeContext([]);
      const active = filterActiveSlots(recipeCtx.recipes);
      const { container } = render(
        <PropertiesChartView main={active[0]} persistKey={STORAGE_KEYS.propertiesChartPanelView} />,
      );
      await act(async () => {});

      expect(getSelectedOptionLabel(container, "#normalize-toggle-select")).toBe(
        NORM_MODE_SHORT_LABELS[NormMode.TargetCentered],
      );
    });

    it("writes the ColorMode leaf key when the select changes", async () => {
      const recipeCtx = makeMockRecipeContext([]);
      const active = filterActiveSlots(recipeCtx.recipes);
      const { container } = render(
        <PropertiesChartView main={active[0]} persistKey={STORAGE_KEYS.propertiesChartPanelView} />,
      );
      await act(async () => {});

      await setColorModeSelect(container, ColorMode.Range);
      await act(async () => {});

      expect(localStorage.getItem(COLOR_KEY)).toBe(JSON.stringify(ColorMode.Range));
    });
  });
});
