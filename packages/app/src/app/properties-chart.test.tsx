import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";

import { Recipe } from "@/app/recipe";
import { KeyFilter } from "@/lib/ui/key-filter-select";
import { Color, getColor, addOrUpdateAlpha } from "@/lib/styles/colors";
import { Theme } from "@/lib/ui/theme-select";
import {
  MixPropertiesChart,
  getPropKeys,
  getModifiedMixProperty,
  propKeyAsModifiedMedStr,
} from "@/app/properties-chart";

import {
  CompKey,
  FpdKey,
  PropKey,
  compToPropKey,
  fpdToPropKey,
  getMixProperty,
  getPropKeys as getPropKeysAll,
} from "@workspace/sci-cream";

import { RecipeID, getLightRecipe } from "@/__tests__/assets";
import { WASM_BRIDGE } from "@/__tests__/util";
import {
  createMockRecipeContext,
  createMockRefRecipeContext,
  getCompLabel,
  getFpdLabel,
  getPropIndex,
  configCustomKeysAll,
} from "@/__tests__/unit/util";

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

// Mock Chart.js
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

interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  plugins: { legend: { display: boolean }; title: { display: boolean; text: string } };
  scales: { y: { beginAtZero: boolean; title: { display: boolean; text: string } } };
}

interface CapturedChartProps {
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor: string;
      borderColor: string;
      maxBarThickness?: number;
      categoryPercentage?: number;
      barPercentage?: number;
    }>;
  };
  options: ChartOptions;
}

// Store captured props
let capturedBarProps: CapturedChartProps | null = null;

vi.mock("react-chartjs-2", () => ({
  Bar: ({ data, options }: CapturedChartProps) => {
    capturedBarProps = { data, options };
    return <div data-testid="bar-chart">Mocked Bar Chart</div>;
  },
  //   Line: ({ data, options }: CapturedChartProps) => {
  //     capturedBarProps = { data, options };
  //     return <div data-testid="line-chart">Mocked Line Chart</div>;
  //   },
}));

describe("MixPropertiesChart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedBarProps = null;
    setupVitestCanvasMock();
  });

  afterEach(async () => {
    cleanup();
    await vi.waitFor(() => {}, { timeout: 100 });
  });

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
      expect(getModMixProp(fpdToPropKey(FpdKey.ServingTemp))).toBeCloseTo(13.37);

      expect(getModMixProp(compToPropKey(CompKey.AbsPAC))).toBeCloseTo(56.63 / 2);

      expect(getModMixProp(compToPropKey(CompKey.EmulsifiersPerFat))).toBeCloseTo(1.735 * 100);
      expect(getModMixProp(compToPropKey(CompKey.StabilizersPerWater))).toBeCloseTo(0.3466 * 100);
    });

    it("propKeyAsModifiedMedStr should modify specific key strings", () => {
      const propKeyAsModStr = (propKey: PropKey) => propKeyAsModifiedMedStr(propKey);

      expect(propKeyAsModStr(fpdToPropKey(FpdKey.FPD))).toBe("-FPD");
      expect(propKeyAsModStr(fpdToPropKey(FpdKey.ServingTemp))).toBe("-Serving Temp");

      expect(propKeyAsModStr(compToPropKey(CompKey.AbsPAC))).toBe("Abs.PAC / 2");

      expect(propKeyAsModStr(compToPropKey(CompKey.EmulsifiersPerFat))).toBe("Emul./Fat * 100");
      expect(propKeyAsModStr(compToPropKey(CompKey.StabilizersPerWater))).toBe("Stab./Water * 100");
    });
  });

  describe("Component Rendering", () => {
    it("should render the component", () => {
      const recipeCtx = createMockRecipeContext();
      render(<MixPropertiesChart recipes={recipeCtx.recipes} theme={Theme.Light} />);
      expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    });

    it("should render the correct component structure", () => {
      const recipeCtx = createMockRecipeContext();
      const { container } = render(
        <MixPropertiesChart recipes={recipeCtx.recipes} theme={Theme.Light} />,
      );
      expect(container.querySelector("#mix-properties-chart")).toBeInTheDocument();
      expect(container.querySelector(".grid-component")).toBeInTheDocument();
    });
  });

  describe("Recipe Filtering", () => {
    it("should display only the main recipe when all recipes are empty", () => {
      const recipeCtx = createMockRecipeContext();
      render(<MixPropertiesChart recipes={recipeCtx.recipes} theme={Theme.Light} />);

      expect(capturedBarProps).not.toBeNull();
      expect(capturedBarProps!.data.datasets).toHaveLength(1);
      expect(capturedBarProps!.data.datasets[0].label).toBe("Recipe");
    });

    it("should display main recipe and non-empty reference recipes", () => {
      const recipeCtx = createMockRecipeContext([false, false, true]);
      render(<MixPropertiesChart recipes={recipeCtx.recipes} theme={Theme.Light} />);

      expect(capturedBarProps).not.toBeNull();
      expect(capturedBarProps!.data.datasets).toHaveLength(2);
      expect(capturedBarProps!.data.datasets[0].label).toBe("Recipe");
      expect(capturedBarProps!.data.datasets[1].label).toBe("Ref B");
    });
  });

  describe("KeyFilterSelect Integration", () => {
    it("should render KeyFilterSelect component", () => {
      const recipeCtx = createMockRecipeContext([true]);
      const { container } = render(
        <MixPropertiesChart recipes={recipeCtx.recipes} theme={Theme.Light} />,
      );

      expect(container.querySelector("#key-filter-select")).toBeInTheDocument();
    });
  });

  describe("Property Key Filtering", () => {
    it("should have KeyFilter.Auto by default", () => {
      const recipeCtx = createMockRecipeContext([true]);
      const { container } = render(
        <MixPropertiesChart recipes={recipeCtx.recipes} theme={Theme.Light} />,
      );

      const filterSelect = container.querySelector(
        "#key-filter-select select",
      ) as HTMLSelectElement;
      expect(filterSelect).toBeInTheDocument();
      expect(filterSelect.value).toBe(KeyFilter.Auto);
    });

    it("should have some property keys selected by default", () => {
      const recipeCtx = createMockRecipeContext([true]);
      render(<MixPropertiesChart recipes={recipeCtx.recipes} theme={Theme.Light} />);

      expect(capturedBarProps).not.toBeNull();
      const labels = capturedBarProps!.data.labels;

      expect(labels.length).toBeGreaterThan(0);
      expect(labels).toContain(getCompLabel(CompKey.MilkFat));
    });

    it("should filter out Water and HardnessAt14C", () => {
      const recipeCtx = createMockRecipeContext([true]);
      render(<MixPropertiesChart recipes={recipeCtx.recipes} theme={Theme.Light} />);

      expect(capturedBarProps).not.toBeNull();
      const labels = capturedBarProps!.data.labels;

      expect(labels).not.toContain(getCompLabel(CompKey.Water));
      expect(labels).not.toContain(getFpdLabel(FpdKey.HardnessAt14C));
    });

    it("should show all labels if explicitly selected", async () => {
      const recipeCtx = createMockRecipeContext();
      const { container } = render(
        <MixPropertiesChart recipes={recipeCtx.recipes} theme={Theme.Light} />,
      );

      expect(capturedBarProps).not.toBeNull();
      expect(capturedBarProps!.data.labels.length).toBeGreaterThan(0);

      await configCustomKeysAll(container);

      await waitFor(() => {
        expect(capturedBarProps).not.toBeNull();
        expect(capturedBarProps!.data.labels.length).toBe(getPropKeys().length);
      });
    });
  });

  describe("Chart Configuration", () => {
    it("should configure chart with correct title", () => {
      const recipeCtx = createMockRecipeContext();
      render(<MixPropertiesChart recipes={recipeCtx.recipes} theme={Theme.Light} />);

      expect(capturedBarProps).not.toBeNull();
      expect(capturedBarProps!.options.plugins.title.display).toBe(true);
      expect(capturedBarProps!.options.plugins.title.text).toBe("Mix Properties Chart");
    });

    it("should configure chart with responsive and maintainAspectRatio settings", () => {
      const recipeCtx = createMockRecipeContext();
      render(<MixPropertiesChart recipes={recipeCtx.recipes} theme={Theme.Light} />);

      expect(capturedBarProps!.options.responsive).toBe(true);
      expect(capturedBarProps!.options.maintainAspectRatio).toBe(false);
    });

    it("should configure chart with legend disabled", () => {
      const recipeCtx = createMockRecipeContext();
      render(<MixPropertiesChart recipes={recipeCtx.recipes} theme={Theme.Light} />);

      expect(capturedBarProps!.options.plugins.legend.display).toBe(false);
    });

    it("should configure y-axis to begin at zero", () => {
      const recipeCtx = createMockRecipeContext();
      render(<MixPropertiesChart recipes={recipeCtx.recipes} theme={Theme.Light} />);

      expect(capturedBarProps!.options.scales.y.beginAtZero).toBe(true);
    });

    it("should configure y-axis title to Quantity (%)", () => {
      const recipeCtx = createMockRecipeContext();
      render(<MixPropertiesChart recipes={recipeCtx.recipes} theme={Theme.Light} />);

      expect(capturedBarProps!.options.scales.y.title.display).toBe(true);
      expect(capturedBarProps!.options.scales.y.title.text).toBe("Quantity (%)");
    });
  });

  describe("Dataset Configuration", () => {
    it("should configure datasets with correct bar styling", () => {
      const recipeCtx = createMockRecipeContext();
      render(<MixPropertiesChart recipes={recipeCtx.recipes} theme={Theme.Light} />);

      expect(capturedBarProps).not.toBeNull();
      const dataset = capturedBarProps!.data.datasets[0];
      expect(dataset.maxBarThickness).toBe(40);
      expect(dataset.categoryPercentage).toBe(0.6);
      expect(dataset.barPercentage).toBe(0.8);
    });

    it("should set dataset colors for main recipe and reference recipes", () => {
      const recipeCtx = createMockRecipeContext([true, true, true]);
      render(<MixPropertiesChart recipes={recipeCtx.recipes} theme={Theme.Light} />);

      expect(capturedBarProps).not.toBeNull();
      const datasets = capturedBarProps!.data.datasets;
      const gray = getColor(Color.GraphGray);
      // Main recipe: solid green
      expect(datasets[0].backgroundColor).toBe(getColor(Color.GraphGreen));
      expect(datasets[0].borderColor).toBe(getColor(Color.GraphGreen));
      // Ref A: gray at 0.6 opacity
      expect(datasets[1].backgroundColor).toBe(addOrUpdateAlpha(gray, 0.6));
      expect(datasets[1].borderColor).toBe(addOrUpdateAlpha(gray, 0.8));
      // Ref B: gray at 0.3 opacity
      expect(datasets[2].backgroundColor).toBe(addOrUpdateAlpha(gray, 0.3));
      expect(datasets[2].borderColor).toBe(addOrUpdateAlpha(gray, 0.5));
    });

    it("should set reference recipe colors correctly when some references are empty", () => {
      const recipeCtx = createMockRecipeContext([true, false, true]);
      render(<MixPropertiesChart recipes={recipeCtx.recipes} theme={Theme.Light} />);

      expect(capturedBarProps).not.toBeNull();
      expect(capturedBarProps!.data.datasets).toHaveLength(2);
      expect(capturedBarProps!.data.datasets[0].backgroundColor).toBe(getColor(Color.GraphGreen));
      // Ref B (index 2) clamps to last opacity tier (0.3)
      expect(capturedBarProps!.data.datasets[1].backgroundColor).toBe(
        addOrUpdateAlpha(getColor(Color.GraphGray), 0.3),
      );
    });

    it("should create dataset for each visible recipe", () => {
      const recipeCtx = createMockRecipeContext([true, true, true]);
      render(<MixPropertiesChart recipes={recipeCtx.recipes} theme={Theme.Light} />);
      render(<MixPropertiesChart recipes={recipeCtx.recipes} theme={Theme.Light} />);
      expect(capturedBarProps).not.toBeNull();
      expect(capturedBarProps!.data.datasets).toHaveLength(3);
      expect(capturedBarProps!.data.datasets[0].label).toBe("Recipe");
      expect(capturedBarProps!.data.datasets[1].label).toBe("Ref A");
      expect(capturedBarProps!.data.datasets[2].label).toBe("Ref B");
    });

    it("should not crate dataset for empty reference recipes", () => {
      const recipeCtx = createMockRecipeContext([true, false, true]);
      render(<MixPropertiesChart recipes={recipeCtx.recipes} theme={Theme.Light} />);
      expect(capturedBarProps).not.toBeNull();
      expect(capturedBarProps!.data.datasets).toHaveLength(2);
      expect(capturedBarProps!.data.datasets[0].label).toBe("Recipe");
      expect(capturedBarProps!.data.datasets[1].label).toBe("Ref B");
    });
  });

  describe("Data Values", () => {
    it("should handle zero and NaN property values", async () => {
      const recipeCtx = createMockRecipeContext();
      const { container } = render(
        <MixPropertiesChart recipes={recipeCtx.recipes} theme={Theme.Light} />,
      );

      await configCustomKeysAll(container);

      expect(Math.abs(NaN)).toBeNaN();

      const EmulsPerFatPropKey = compToPropKey(CompKey.EmulsifiersPerFat);
      const AbsPACPropKey = compToPropKey(CompKey.AbsPAC);
      const EmulsPerFatLabel = propKeyAsModifiedMedStr(EmulsPerFatPropKey);
      const AbsPACLabel = propKeyAsModifiedMedStr(AbsPACPropKey);

      expect(capturedBarProps).not.toBeNull();

      const data = capturedBarProps!.data;
      await waitFor(() => expect(data.labels.length).toBe(getPropKeysAll().length - 2));
      expect(data.labels).toContain(EmulsPerFatLabel);
      expect(data.labels).toContain(AbsPACLabel);

      const mixProps = recipeCtx.recipes[0].mixProperties!;
      expect(mixProps.composition.get(CompKey.EmulsifiersPerFat)).toBeNaN();
      expect(mixProps.composition.get(CompKey.AbsPAC)).toBe(0);
      expect(getMixProperty(mixProps, EmulsPerFatPropKey)).toBeNaN();
      expect(getMixProperty(mixProps, AbsPACPropKey)).toBe(0);

      expect(data.datasets[0].data[getPropIndex(data.labels, EmulsPerFatPropKey)]).toBeNaN();
      expect(data.datasets[0].data[getPropIndex(data.labels, AbsPACPropKey)]).toBe(0);
    });

    it("should have modified values and strings", async () => {
      const recipeCtx = createMockRefRecipeContext();
      const { container } = render(
        <MixPropertiesChart recipes={recipeCtx.recipes} theme={Theme.Light} />,
      );

      await configCustomKeysAll(container);

      const EmulsPerFatPropKey = compToPropKey(CompKey.EmulsifiersPerFat);
      const StabsPerfWaterPropKey = compToPropKey(CompKey.StabilizersPerWater);
      const AbsPACPropKey = compToPropKey(CompKey.AbsPAC);
      const ServingTempPropKey = fpdToPropKey(FpdKey.ServingTemp);

      expect(capturedBarProps).not.toBeNull();

      const captured = capturedBarProps!;
      const data = capturedBarProps!.data;
      await waitFor(() => expect(data.labels.length).toBe(getPropKeysAll().length - 2));

      for (const key of [
        EmulsPerFatPropKey,
        StabsPerfWaterPropKey,
        AbsPACPropKey,
        ServingTempPropKey,
      ]) {
        expect(captured.data.labels).toContain(propKeyAsModifiedMedStr(key));
        expect(captured.data.datasets[0].data[getPropIndex(data.labels, key)]).toBeCloseTo(
          getModifiedMixProperty(recipeCtx.recipes[0].mixProperties!, key),
        );
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty recipes array", () => {
      const recipes: Recipe[] = [];
      render(<MixPropertiesChart recipes={recipes} theme={Theme.Light} />);

      expect(capturedBarProps).not.toBeNull();
      expect(capturedBarProps!.data.datasets).toHaveLength(0);
    });
  });
});
