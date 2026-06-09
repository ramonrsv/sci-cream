import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";

import { Color, getColor, addOrUpdateAlpha } from "@/lib/styles/colors";
import {
  PropertiesBarChart,
  PropertiesChartView,
  getPropKeys,
  getModifiedMixProperty,
  propKeyAsModifiedShortStr,
} from "@/app/_elements/charts/properties-chart";
import { filterActiveSlots } from "@/lib/recipe";
import { KeyFilter } from "@/app/_elements/selects/key-filter-select";
import { getSelectedOptionLabel } from "@/__tests__/unit/select";

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
} from "@workspace/sci-cream";

import { RecipeID, getLightRecipe } from "@/__tests__/assets";
import { WASM_BRIDGE } from "@/__tests__/util";
import {
  makeMockRecipeContext,
  getCompLabel,
  getFpdLabel,
  getPropIndex,
  configCustomKeysAll,
} from "@/__tests__/unit/util";

/** Mock implementation of ResizeObserver for testing purposes */
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

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

vi.mock("chartjs-chart-error-bars", () => ({
  BarWithErrorBarsController: vi.fn(),
  BarWithErrorBar: vi.fn(),
}));

interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  plugins: { legend: { display: boolean }; title: { display: boolean; text: string } };
  scales: { y: { beginAtZero: boolean; title: { display: boolean; text: string } } };
}

interface CapturedChartProps {
  type: string;
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: Array<{ y: number; yMin: number; yMax: number }>;
      backgroundColor: string | string[];
      borderColor: string;
      maxBarThickness?: number;
      categoryPercentage?: number;
      barPercentage?: number;
    }>;
  };
  options: ChartOptions;
}

let capturedBarProps: CapturedChartProps | null = null;

vi.mock("react-chartjs-2", () => ({
  Chart: ({ type, data, options }: CapturedChartProps) => {
    capturedBarProps = { type, data, options };
    return <div data-testid="bar-chart">Mocked Bar Chart</div>;
  },
}));

/** Convenience: build active recipes from a mock context and render the bar chart with them */
function renderFromContext(recipeIds: RecipeID[], propKeys: PropKey[] = getPropKeys()) {
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
  it("getPropKeys should exclude Water and HardnessAt14C", () => {
    expect(getPropKeys().length).toBe(getPropKeysAll().length - 2);
    expect(getPropKeys()).not.toContain(compToPropKey(CompKey.Water));
    expect(getPropKeys()).not.toContain(fpdToPropKey(FpdKey.HardnessAt14C));
  });

  it("getModifiedMixProperty should modify specific property values", () => {
    const mixProperties = WASM_BRIDGE.calculate_recipe_mix_properties(
      getLightRecipe(RecipeID.Main),
    );
    const getModMixProp = (propKey: PropKey) => getModifiedMixProperty(mixProperties, propKey);

    expect(getModMixProp(fpdToPropKey(FpdKey.FPD))).toBeCloseTo(3.6);
    expect(getModMixProp(fpdToPropKey(FpdKey.ServingTemp))).toBeCloseTo(13.357);

    expect(getModMixProp(ratioToPropKey(RatioKey.AbsPAC))).toBeCloseTo(56.576 / 2);

    expect(getModMixProp(ratioToPropKey(RatioKey.EmulsifiersPerFat))).toBeCloseTo(1.7311 * 100);
    expect(getModMixProp(ratioToPropKey(RatioKey.StabilizersPerWater))).toBeCloseTo(0.3466 * 100);
  });

  it("propKeyAsModifiedShortStr should modify specific key strings", () => {
    const propKeyAsModStr = (propKey: PropKey) => propKeyAsModifiedShortStr(propKey);

    expect(propKeyAsModStr(fpdToPropKey(FpdKey.FPD))).toBe("-FPD");
    expect(propKeyAsModStr(fpdToPropKey(FpdKey.ServingTemp))).toBe("-Serving Temp");

    expect(propKeyAsModStr(ratioToPropKey(RatioKey.AbsPAC))).toBe("Abs.PAC / 2");

    expect(propKeyAsModStr(ratioToPropKey(RatioKey.EmulsifiersPerFat))).toBe("Emul./Fat * 100");
    expect(propKeyAsModStr(ratioToPropKey(RatioKey.StabilizersPerWater))).toBe("Stab./Water * 100");
  });
});

// ---------------------------------------------------------------------------
// PropertiesBarChart
// ---------------------------------------------------------------------------

describe("PropertiesBarChart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedBarProps = null;
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

    it("should produce one dataset per recipe (main + refs)", () => {
      renderFromContext([RecipeID.Main, RecipeID.RefA, RecipeID.RefB]);
      expect(capturedBarProps!.data.datasets).toHaveLength(3);
      expect(capturedBarProps!.data.datasets[0].label).toBe("Recipe");
      expect(capturedBarProps!.data.datasets[1].label).toBe("Ref A");
      expect(capturedBarProps!.data.datasets[2].label).toBe("Ref B");
    });
  });

  // ---- Dataset Configuration ------------------------------------------------------------------

  describe("Dataset Configuration", () => {
    it("should configure datasets with correct bar styling", () => {
      renderFromContext([]);
      const dataset = capturedBarProps!.data.datasets[0];
      expect(dataset.maxBarThickness).toBe(40);
      expect(dataset.categoryPercentage).toBe(0.6);
      expect(dataset.barPercentage).toBe(0.8);
    });

    it("should set dataset colors for main recipe and reference recipes", () => {
      renderFromContext([RecipeID.Main, RecipeID.RefA, RecipeID.RefB]);
      const datasets = capturedBarProps!.data.datasets;
      const gray = getColor(Color.GraphGray);
      const green = getColor(Color.GraphGreen);
      // Main recipe: per-bar colors array, all green (empty recipe has no out-of-range values)
      expect(datasets[0].backgroundColor).toBeInstanceOf(Array);
      expect((datasets[0].backgroundColor as string[]).every((c) => c === green)).toBe(true);
      expect(datasets[0].borderColor).toBe(green);
      // Ref A: gray at 0.6 opacity
      expect(datasets[1].backgroundColor).toBe(addOrUpdateAlpha(gray, 0.6));
      expect(datasets[1].borderColor).toBe(addOrUpdateAlpha(gray, 0.8));
      // Ref B: gray at 0.3 opacity
      expect(datasets[2].backgroundColor).toBe(addOrUpdateAlpha(gray, 0.3));
      expect(datasets[2].borderColor).toBe(addOrUpdateAlpha(gray, 0.5));
    });
  });

  // ---- Chart Configuration --------------------------------------------------------------------

  describe("Chart Configuration", () => {
    it("should configure chart with correct title", () => {
      renderFromContext([]);
      expect(capturedBarProps!.options.plugins.title.display).toBe(true);
      expect(capturedBarProps!.options.plugins.title.text).toBe("Mix Properties Chart");
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
      expect(capturedBarProps!.options.scales.y.title.display).toBe(true);
      expect(capturedBarProps!.options.scales.y.title.text).toBe("Quantity (%)");
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

    it("should filter out Water and HardnessAt14C", () => {
      renderViewFromContext([RecipeID.Main]);
      const labels = capturedBarProps!.data.labels;
      expect(labels).not.toContain(getCompLabel(CompKey.Water));
      expect(labels).not.toContain(getFpdLabel(FpdKey.HardnessAt14C));
    });

    it("should show all labels if explicitly selected", async () => {
      const { container } = renderViewFromContext([]);
      expect(capturedBarProps!.data.labels.length).toBeGreaterThan(0);

      await configCustomKeysAll(container);

      await waitFor(() => {
        expect(capturedBarProps!.data.labels.length).toBe(getPropKeys().length);
      });
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
      await waitFor(() => expect(data.labels.length).toBe(getPropKeysAll().length - 2));
      expect(data.labels).toContain(EmulsPerFatLabel);
      expect(data.labels).toContain(AbsPACLabel);

      const mixProps = recipeCtx.recipes[0].mixProperties!;
      expect(mixProps.composition.get_ratio(RatioKey.EmulsifiersPerFat)).toBeNaN();
      expect(mixProps.composition.get_ratio(RatioKey.AbsPAC)).toBe(0);
      expect(getMixProperty(mixProps, EmulsPerFatPropKey)).toBeNaN();
      expect(getMixProperty(mixProps, AbsPACPropKey)).toBe(0);

      expect(data.datasets[0].data[getPropIndex(data.labels, EmulsPerFatPropKey)].y).toBeNaN();
      expect(data.datasets[0].data[getPropIndex(data.labels, AbsPACPropKey)].y).toBe(0);
    });

    it("should have modified values and strings", async () => {
      const { container, recipeCtx } = renderViewFromContext([RecipeID.Main]);

      await configCustomKeysAll(container);

      const data = capturedBarProps!.data;
      await waitFor(() => expect(data.labels.length).toBe(getPropKeysAll().length - 2));

      for (const key of [
        ratioToPropKey(RatioKey.EmulsifiersPerFat),
        ratioToPropKey(RatioKey.StabilizersPerWater),
        ratioToPropKey(RatioKey.AbsPAC),
        fpdToPropKey(FpdKey.ServingTemp),
      ]) {
        expect(data.labels).toContain(propKeyAsModifiedShortStr(key));
        expect(data.datasets[0].data[getPropIndex(data.labels, key)].y).toBeCloseTo(
          getModifiedMixProperty(recipeCtx.recipes[0].mixProperties!, key),
        );
      }
    });
  });
});
