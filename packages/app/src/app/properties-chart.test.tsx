import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";

import {
  MixPropertiesChart,
  getPropKeys,
  getModifiedMixProperty,
  propKeyAsModifiedMedStr,
} from "./properties-chart";
import { Recipe, makeEmptyRecipeContext } from "./recipe";
import { KeyFilter } from "@/lib/ui/key-selection";
import { Color, getColor } from "../lib/styles/colors";
import { Theme } from "@/lib/ui/theme-select";

import {
  CompKey,
  FpdKey,
  PropKey,
  compToPropKey,
  fpdToPropKey,
  prop_key_as_med_str,
  getMixProperty,
  getPropKeys as getPropKeysAll,
  new_ingredient_database_seeded_from_embedded_data,
  Bridge as WasmBridge,
} from "@workspace/sci-cream";

import { REF_LIGHT_RECIPE } from "@/__tests__/assets";

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

function createMockRecipeContext(nonEmptyRecipes: boolean[] = []) {
  const recipeCtx = makeEmptyRecipeContext();
  nonEmptyRecipes.forEach((isEmpty, index) => {
    recipeCtx.recipes[index].mixTotal = isEmpty ? 100 : undefined;
  });
  return recipeCtx;
}

function createMockRefRecipeContext() {
  const recipeCtx = makeEmptyRecipeContext();
  recipeCtx.recipes[0].mixTotal = 612;
  recipeCtx.recipes[0].mixProperties = wasmBridge.calculate_recipe_mix_properties(REF_LIGHT_RECIPE);
  return recipeCtx;
}

const getCompLabel = (compKey: CompKey) => prop_key_as_med_str(compToPropKey(compKey));
const getFpdLabel = (fpdKey: FpdKey) => prop_key_as_med_str(fpdToPropKey(fpdKey));

const getPropIndex = (labels: string[], propKey: PropKey) =>
  labels.indexOf(propKeyAsModifiedMedStr(propKey));

const wasmBridge = new WasmBridge(new_ingredient_database_seeded_from_embedded_data());

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
      const mixProperties = wasmBridge.calculate_recipe_mix_properties(REF_LIGHT_RECIPE);
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

  describe("KeySelection Integration", () => {
    it("should render KeySelection component", () => {
      const recipeCtx = createMockRecipeContext([true]);
      const { container } = render(
        <MixPropertiesChart recipes={recipeCtx.recipes} theme={Theme.Light} />,
      );

      expect(container.querySelector("#key-selection")).toBeInTheDocument();
    });
  });

  const selectKeyFilter = async (container: HTMLElement, optionValue: KeyFilter) => {
    const filterSelect = container.querySelector("#key-filter-select") as HTMLSelectElement;
    expect(filterSelect).toBeInTheDocument();
    fireEvent.change(filterSelect, { target: { value: optionValue } });
  };

  const configCustomKeysAll = async (container: HTMLElement) => {
    await selectKeyFilter(container, KeyFilter.Custom);
    await waitFor(() =>
      expect(container.querySelector("#customize-keys-button")).toBeInTheDocument(),
    );

    const customKeysBtn = container.querySelector("#customize-keys-button") as HTMLButtonElement;
    fireEvent.click(customKeysBtn);
    await waitFor(() => expect(screen.getByText("All Properties")).toBeInTheDocument());

    const listItem = screen.getByText(/All Properties/i).closest("li");
    const allPropsCheckbox = within(listItem!).getByRole("checkbox");
    expect(allPropsCheckbox).toBeInTheDocument();
    fireEvent.click(allPropsCheckbox);
  };

  describe("Property Key Filtering", () => {
    it("should have KeyFilter.Auto by default", () => {
      const recipeCtx = createMockRecipeContext([true]);
      const { container } = render(
        <MixPropertiesChart recipes={recipeCtx.recipes} theme={Theme.Light} />,
      );

      const filterSelect = container.querySelector("#key-filter-select") as HTMLSelectElement;
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
      capturedBarProps!.data.datasets.forEach((dataset, index) => {
        const expectedColor = index === 0 ? getColor(Color.GraphGreen) : getColor(Color.GraphGray);

        expect(dataset.backgroundColor).toBe(expectedColor);
        expect(dataset.borderColor).toBe(expectedColor);
      });
    });

    it("should set main recipe color green, and reference recipes gray", () => {
      const recipeCtx = createMockRecipeContext([true, false, true]);
      render(<MixPropertiesChart recipes={recipeCtx.recipes} theme={Theme.Light} />);

      expect(capturedBarProps).not.toBeNull();
      expect(capturedBarProps!.data.datasets).toHaveLength(2);
      expect(capturedBarProps!.data.datasets[0].backgroundColor).toBe(getColor(Color.GraphGreen));
      expect(capturedBarProps!.data.datasets[1].backgroundColor).toBe(getColor(Color.GraphGray));
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
