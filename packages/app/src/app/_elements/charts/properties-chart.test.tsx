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
import {
  PropertiesBarChart,
  PropertiesChartView,
  getModifiedMixProperty,
  getModifiedAcceptablePropertyRange,
  propKeyAsModifiedShortStr,
} from "@/app/_elements/charts/properties-chart";
import { filterActiveSlots } from "@/lib/recipe";
import { KeyFilter } from "@/app/_elements/selects/key-filter-select";
import { getSelectedOptionLabel } from "@/__tests__/unit/select";
import { UNCONDITIONAL_AUTO_PROPERTIES } from "@/lib/sci-cream/sci-cream";

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
} from "@workspace/sci-cream";

import { STORAGE_KEYS } from "@/lib/local-storage";

import { RecipeID, getLightRecipe } from "@/__tests__/assets";
import { WASM_BRIDGE } from "@/__tests__/util";
import {
  makeMockRecipeContext,
  getCompLabel,
  getPropIndex,
  configCustomKeysAll,
  setKeyFilterSelect,
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

interface RangeMeterOptions {
  bandRanges: ({ yMin: number; yMax: number } | null)[];
  bandColor: string;
  refMarkers: Array<{ label: string; color: string; dash: number[]; values: (number | null)[] }>;
  horizontal: boolean;
}

interface ScaleConfig {
  beginAtZero?: boolean;
  max?: number;
  title?: { display: boolean; text: string };
  grid?: { display?: boolean; color?: string };
}

interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  indexAxis?: "x" | "y";
  plugins: {
    rangeMeter: RangeMeterOptions;
    legend: { display: boolean };
    title?: { display: boolean; text: string };
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

/** Convenience: build active recipes from a mock context and render the bar chart with them */
function renderFromContext(recipeIds: RecipeID[], propKeys: PropKey[] = getMixScopePropKeys()) {
  const recipeCtx = makeMockRecipeContext(recipeIds);
  const active = filterActiveSlots(recipeCtx.recipes);
  return {
    recipeCtx,
    ...render(<PropertiesBarChart main={active[0]} refs={active.slice(1)} propKeys={propKeys} />),
  };
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

describe("Helper Functions", () => {
  it("getModifiedMixProperty should modify specific property values", () => {
    const mixProperties = WASM_BRIDGE.calculate_recipe_mix_properties(
      getLightRecipe(RecipeID.Main),
    );
    const getModMixProp = (propKey: PropKey) => getModifiedMixProperty(mixProperties, propKey);

    expect(getModMixProp(fpdToPropKey(FpdKey.FPD))).toBeCloseTo(3.612);
    expect(getModMixProp(fpdToPropKey(FpdKey.ServingTemp))).toBeCloseTo(13.402);

    expect(getModMixProp(ratioToPropKey(RatioKey.AbsPAC))).toBeCloseTo(28.374);
    expect(getModMixProp(compToPropKey(CompKey.Water))).toBeCloseTo(
      getMixProperty(mixProperties, compToPropKey(CompKey.Water)) / 2,
    );
    expect(getModMixProp(fpdToPropKey(FpdKey.HardnessAt14C))).toBeCloseTo(
      getMixProperty(mixProperties, fpdToPropKey(FpdKey.HardnessAt14C)) / 2,
    );

    expect(getModMixProp(ratioToPropKey(RatioKey.EmulsifiersPerFat))).toBeCloseTo(1.7907 * 10);
    expect(getModMixProp(ratioToPropKey(RatioKey.StabilizersPerWater))).toBeCloseTo(0.3467 * 100);

    expect(getModMixProp(ratioToPropKey(RatioKey.AbsNetPAC))).toBeCloseTo(
      getMixProperty(mixProperties, ratioToPropKey(RatioKey.AbsNetPAC)) / 3,
    );
    expect(getModMixProp(compToPropKey(CompKey.EggSNF))).toBeCloseTo(
      getMixProperty(mixProperties, compToPropKey(CompKey.EggSNF)) * 10,
    );
    expect(getModMixProp(compToPropKey(CompKey.Alcohol))).toBeCloseTo(
      getMixProperty(mixProperties, compToPropKey(CompKey.Alcohol)) * 10,
    );
    expect(getModMixProp(compToPropKey(CompKey.Salt))).toBeCloseTo(
      getMixProperty(mixProperties, compToPropKey(CompKey.Salt)) * 100,
    );
  });

  it("propKeyAsModifiedShortStr should modify specific key strings", () => {
    const propKeyAsModStr = (propKey: PropKey) => propKeyAsModifiedShortStr(propKey);

    expect(propKeyAsModStr(fpdToPropKey(FpdKey.FPD))).toBe("-FPD");
    expect(propKeyAsModStr(fpdToPropKey(FpdKey.ServingTemp))).toBe("-Serving Temp");

    expect(propKeyAsModStr(ratioToPropKey(RatioKey.AbsPAC))).toBe("Abs.PAC / 2");
    expect(propKeyAsModStr(compToPropKey(CompKey.Water))).toBe("Water / 2");
    expect(propKeyAsModStr(fpdToPropKey(FpdKey.HardnessAt14C))).toBe("Hardness @-14°C / 2");

    expect(propKeyAsModStr(ratioToPropKey(RatioKey.EmulsifiersPerFat))).toBe("Emul./Fat * 10");
    expect(propKeyAsModStr(ratioToPropKey(RatioKey.StabilizersPerWater))).toBe("Stab./Water * 100");

    expect(propKeyAsModStr(ratioToPropKey(RatioKey.AbsNetPAC))).toBe("Abs.Net PAC / 3");
    expect(propKeyAsModStr(compToPropKey(CompKey.EggSNF))).toBe("Egg SNF * 10");
    expect(propKeyAsModStr(compToPropKey(CompKey.Alcohol))).toBe("Alcohol * 10");
    expect(propKeyAsModStr(compToPropKey(CompKey.Salt))).toBe("Salt * 100");
  });
});

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
      const refMarkers = capturedBarProps!.options.plugins.rangeMeter.refMarkers;
      expect(refMarkers.map((r) => r.label)).toEqual(["Ref A", "Ref B"]);
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
      const rangeKey = keys.find((k) => getModifiedAcceptablePropertyRange(k) !== null)!;
      const noRangeKey = keys.find((k) => getModifiedAcceptablePropertyRange(k) === null)!;
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
      const refMarkers = capturedBarProps!.options.plugins.rangeMeter.refMarkers;
      expect(refMarkers).toHaveLength(2);
      expect(refMarkers[0].color).toBe(expectedRefColor);
      expect(refMarkers[0].dash).toEqual([]);
      expect(refMarkers[1].color).toBe(expectedRefColor);
      expect(refMarkers[1].dash).toEqual([4, 3]);
    });

    it("should pass acceptable-range bands aligned to the labels", () => {
      const propKeys: PropKey[] = [compToPropKey(CompKey.MSNF), ratioToPropKey(RatioKey.AbsPAC)];
      renderFromContext([RecipeID.Main], propKeys);
      const { bandRanges } = capturedBarProps!.options.plugins.rangeMeter;
      expect(bandRanges).toHaveLength(propKeys.length);
      propKeys.forEach((key, i) => {
        expect(bandRanges[i]).toEqual(getModifiedAcceptablePropertyRange(key) ?? null);
      });
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

    it("should configure y-axis to begin at zero", () => {
      renderFromContext([]);
      expect(capturedBarProps!.options.scales.y.beginAtZero).toBe(true);
    });

    it("should configure y-axis title to Quantity (%)", () => {
      renderFromContext([]);
      expect(capturedBarProps!.options.scales.y.title!.display).toBe(true);
      expect(capturedBarProps!.options.scales.y.title!.text).toBe("Quantity (%)");
    });
  });

  // ---- Orientation -----------------------------------------------------------------------------

  describe("Orientation", () => {
    it("defaults to vertical bars (value axis on y) when unmeasured", () => {
      renderFromContext([RecipeID.Main]);
      expect(capturedBarProps!.options.indexAxis).toBe("x");
      expect(capturedBarProps!.options.plugins.rangeMeter.horizontal).toBe(false);
      // Value scale (beginAtZero + title) sits on y; category scale (no title) on x.
      expect(capturedBarProps!.options.scales.y.beginAtZero).toBe(true);
      expect(capturedBarProps!.options.scales.y.title!.text).toBe("Quantity (%)");
      expect(capturedBarProps!.options.scales.x.title).toBeUndefined();
    });

    it("rotates to horizontal bars when the container is portrait", () => {
      mockSize = { width: 320, height: 560 };
      renderFromContext([RecipeID.Main]);
      expect(capturedBarProps!.options.indexAxis).toBe("y");
      expect(capturedBarProps!.options.plugins.rangeMeter.horizontal).toBe(true);
      // Orientation swaps the axis roles: the value scale moves to x, the category scale to y.
      expect(capturedBarProps!.options.scales.x.beginAtZero).toBe(true);
      expect(capturedBarProps!.options.scales.x.title!.text).toBe("Quantity (%)");
      expect(capturedBarProps!.options.scales.y.title).toBeUndefined();
    });
  });

  // ---- Labels ----------------------------------------------------------------------------------

  describe("Labels", () => {
    it("should render a label per provided propKey, modified for chart display", () => {
      const propKeys: PropKey[] = [ratioToPropKey(RatioKey.AbsPAC), fpdToPropKey(FpdKey.FPD)];
      renderFromContext([], propKeys);
      expect(capturedBarProps!.data.labels).toEqual(propKeys.map(propKeyAsModifiedShortStr));
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
      expect(labels).toContain(propKeyAsModifiedShortStr(compToPropKey(CompKey.MilkFat)));

      // NutSNF is a default key but inactive (no nuts in the main recipe), so it is filtered out.
      expect(labels).not.toContain(propKeyAsModifiedShortStr(compToPropKey(CompKey.NutSNF)));
    });

    it("Auto filter shows unconditional keys but no inactive keys for an empty recipe", () => {
      renderViewFromContext([]);
      const labels = capturedBarProps!.data.labels;
      for (const key of UNCONDITIONAL_AUTO_PROPERTIES) {
        expect(labels).toContain(propKeyAsModifiedShortStr(key));
      }
      // MilkFat is a default key, but inactive in an empty recipe and not unconditional.
      expect(labels).not.toContain(propKeyAsModifiedShortStr(compToPropKey(CompKey.MilkFat)));
    });
  });

  describe("Data Values", () => {
    it("should handle zero and NaN property values", async () => {
      const { container, recipeCtx } = renderViewFromContext([]);

      await configCustomKeysAll(container);

      const EmulsPerFatPropKey = ratioToPropKey(RatioKey.EmulsifiersPerFat);
      const AbsPACPropKey = ratioToPropKey(RatioKey.AbsPAC);
      const EmulsPerFatLabel = propKeyAsModifiedShortStr(EmulsPerFatPropKey);
      const AbsPACLabel = propKeyAsModifiedShortStr(AbsPACPropKey);

      const data = capturedBarProps!.data;
      await waitFor(() => expect(data.labels.length).toBe(getMixScopePropKeys().length));
      expect(data.labels).toContain(EmulsPerFatLabel);
      expect(data.labels).toContain(AbsPACLabel);

      const mixProps = recipeCtx.recipes[0].mixProperties!;
      expect(mixProps.composition.get_ratio(RatioKey.EmulsifiersPerFat)).toBeNaN();
      expect(mixProps.composition.get_ratio(RatioKey.AbsPAC)).toBe(0);
      expect(getMixProperty(mixProps, EmulsPerFatPropKey)).toBeNaN();
      expect(getMixProperty(mixProps, AbsPACPropKey)).toBe(0);

      expect(data.datasets[0].data[getPropIndex(data.labels, EmulsPerFatPropKey)]).toBeNaN();
      expect(data.datasets[0].data[getPropIndex(data.labels, AbsPACPropKey)]).toBe(0);
    });

    it("should have modified values and strings", async () => {
      const { container, recipeCtx } = renderViewFromContext([RecipeID.Main]);

      await configCustomKeysAll(container);

      const data = capturedBarProps!.data;
      await waitFor(() => expect(data.labels.length).toBe(getMixScopePropKeys().length));

      for (const key of [
        ratioToPropKey(RatioKey.EmulsifiersPerFat),
        ratioToPropKey(RatioKey.StabilizersPerWater),
        ratioToPropKey(RatioKey.AbsPAC),
        fpdToPropKey(FpdKey.ServingTemp),
      ]) {
        expect(data.labels).toContain(propKeyAsModifiedShortStr(key));
        expect(data.datasets[0].data[getPropIndex(data.labels, key)]).toBeCloseTo(
          getModifiedMixProperty(recipeCtx.recipes[0].mixProperties!, key),
        );
      }
    });
  });

  // ---- Select persistence -----------------------------------------------------------------

  describe("Select persistence", () => {
    const FILTER_KEY = `${STORAGE_KEYS.propertiesChartPanelView}:filter`;

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
  });
});
