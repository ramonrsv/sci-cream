import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

import { MixPropertiesChart, getPropKeys } from "./properties-chart";
import { Recipe, makeEmptyRecipeContext } from "./recipe";
import { KeyFilter } from "@/lib/ui/key-selection";
import { recipeChartColor } from "../lib/styles/colors";

import {
  CompKey,
  FpdKey,
  PropKey,
  compToPropKey,
  fpdToPropKey,
  prop_key_as_med_str,
  getMixProperty,
  getPropKeys as getPropKeysAll,
} from "@workspace/sci-cream";

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

const getCompLabel = (compKey: CompKey) => prop_key_as_med_str(compToPropKey(compKey));
const getFpdLabel = (fpdKey: FpdKey) => prop_key_as_med_str(fpdToPropKey(fpdKey));
const getPropIndex = (propKey: PropKey) => getPropKeys().indexOf(propKey);

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
  });

  describe("Component Rendering", () => {
    it("should render the component", () => {
      const recipeCtx = createMockRecipeContext();
      render(<MixPropertiesChart recipes={recipeCtx.recipes} />);
      expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    });

    it("should render the correct component structure", () => {
      const recipeCtx = createMockRecipeContext();
      const { container } = render(<MixPropertiesChart recipes={recipeCtx.recipes} />);
      expect(container.querySelector("#mix-properties-chart")).toBeInTheDocument();
      expect(container.querySelector(".grid-component")).toBeInTheDocument();
      expect(container.querySelector(".component-inner-border")).toBeInTheDocument();
    });
  });

  describe("Recipe Filtering", () => {
    it("should display only the main recipe when all recipes are empty", () => {
      const recipeCtx = createMockRecipeContext();
      render(<MixPropertiesChart recipes={recipeCtx.recipes} />);

      expect(capturedBarProps).not.toBeNull();
      expect(capturedBarProps!.data.datasets).toHaveLength(1);
      expect(capturedBarProps!.data.datasets[0].label).toBe("Recipe");
    });

    it("should display main recipe and non-empty reference recipes", () => {
      const recipeCtx = createMockRecipeContext([false, false, true]);
      render(<MixPropertiesChart recipes={recipeCtx.recipes} />);

      expect(capturedBarProps).not.toBeNull();
      expect(capturedBarProps!.data.datasets).toHaveLength(2);
      expect(capturedBarProps!.data.datasets[0].label).toBe("Recipe");
      expect(capturedBarProps!.data.datasets[1].label).toBe("Ref 2");
    });
  });

  describe("KeySelection Integration", () => {
    it("should render KeySelection component", () => {
      const recipeCtx = createMockRecipeContext([true]);
      const { container } = render(<MixPropertiesChart recipes={recipeCtx.recipes} />);

      expect(container.querySelector("#key-selection")).toBeInTheDocument();
    });
  });

  describe("Property Key Filtering", () => {
    it("should have KeyFilter.Auto by default", () => {
      const recipeCtx = createMockRecipeContext([true]);
      const { container } = render(<MixPropertiesChart recipes={recipeCtx.recipes} />);

      const filterSelect = container.querySelector("select") as HTMLSelectElement;
      expect(filterSelect).toBeInTheDocument();
      expect(filterSelect.value).toBe(KeyFilter.Auto);
    });

    it("should have some property keys selected by default", () => {
      const recipeCtx = createMockRecipeContext([true]);
      render(<MixPropertiesChart recipes={recipeCtx.recipes} />);

      expect(capturedBarProps).not.toBeNull();
      const labels = capturedBarProps!.data.labels;

      expect(labels.length).toBeGreaterThan(0);
      expect(labels).toContain(getCompLabel(CompKey.MilkFat));
    });

    it("should filter out Water and HardnessAt14C", () => {
      const recipeCtx = createMockRecipeContext([true]);
      render(<MixPropertiesChart recipes={recipeCtx.recipes} />);

      expect(capturedBarProps).not.toBeNull();
      const labels = capturedBarProps!.data.labels;

      // Water and HardnessAt14C should be excluded
      expect(labels).not.toContain(getCompLabel(CompKey.Water));
      expect(labels).not.toContain(getFpdLabel(FpdKey.HardnessAt14C));
    });

    it("should show no labels for an empty recipe with KeyFilter.NonZero", async () => {
      const recipeCtx = createMockRecipeContext();
      const { container } = render(<MixPropertiesChart recipes={recipeCtx.recipes} />);

      expect(capturedBarProps).not.toBeNull();
      expect(capturedBarProps!.data.labels.length).toBeGreaterThan(0);

      const filterSelect = container.querySelector("select") as HTMLSelectElement;
      expect(filterSelect).toBeInTheDocument();
      fireEvent.change(filterSelect, { target: { value: KeyFilter.NonZero } });

      await waitFor(() => {
        expect(capturedBarProps).not.toBeNull();
        expect(capturedBarProps!.data.labels.length).toBe(0);
      });
    });

    it("should show non-zero labels if KeyFilter.NonZero and any recipe has non-zero values", async () => {
      const recipeCtx = createMockRecipeContext([true, false, true]);

      {
        const composition = recipeCtx.recipes[0].mixProperties!.composition;
        composition.pod = 5;
        recipeCtx.recipes[0].mixProperties!.composition = composition;
      }

      {
        const composition = recipeCtx.recipes[2].mixProperties!.composition;
        const pac = composition.pac;
        pac.sugars = 10;
        composition.pac = pac;
        recipeCtx.recipes[2].mixProperties!.composition = composition;
      }

      const { container } = render(<MixPropertiesChart recipes={recipeCtx.recipes} />);
      const filterSelect = container.querySelector("select") as HTMLSelectElement;
      expect(filterSelect).toBeInTheDocument();
      fireEvent.change(filterSelect, { target: { value: KeyFilter.NonZero } });

      await waitFor(() => {
        expect(capturedBarProps).not.toBeNull();
        expect(capturedBarProps!.data.labels.length).toBeGreaterThanOrEqual(2);
        expect(capturedBarProps!.data.labels).toContain(getCompLabel(CompKey.POD));
        expect(capturedBarProps!.data.labels).toContain(getCompLabel(CompKey.PACsgr));
      });
    });

    it("should show all labels for KeyFilter.All", async () => {
      const recipeCtx = createMockRecipeContext();
      const { container } = render(<MixPropertiesChart recipes={recipeCtx.recipes} />);

      expect(capturedBarProps).not.toBeNull();
      expect(capturedBarProps!.data.labels.length).toBeGreaterThan(0);

      const filterSelect = container.querySelector("select") as HTMLSelectElement;
      expect(filterSelect).toBeInTheDocument();
      fireEvent.change(filterSelect, { target: { value: KeyFilter.All } });

      await waitFor(() => {
        expect(capturedBarProps).not.toBeNull();
        expect(capturedBarProps!.data.labels.length).toBe(getPropKeys().length);
      });
    });
  });

  describe("Chart Configuration", () => {
    it("should configure chart with correct title", () => {
      const recipeCtx = createMockRecipeContext();
      render(<MixPropertiesChart recipes={recipeCtx.recipes} />);

      expect(capturedBarProps).not.toBeNull();
      expect(capturedBarProps!.options.plugins.title.display).toBe(true);
      expect(capturedBarProps!.options.plugins.title.text).toBe("Mix Properties Chart");
    });

    it("should configure chart with responsive and maintainAspectRatio settings", () => {
      const recipeCtx = createMockRecipeContext();
      render(<MixPropertiesChart recipes={recipeCtx.recipes} />);

      expect(capturedBarProps!.options.responsive).toBe(true);
      expect(capturedBarProps!.options.maintainAspectRatio).toBe(false);
    });

    it("should configure chart with legend disabled", () => {
      const recipeCtx = createMockRecipeContext();
      render(<MixPropertiesChart recipes={recipeCtx.recipes} />);

      expect(capturedBarProps!.options.plugins.legend.display).toBe(false);
    });

    it("should configure y-axis to begin at zero", () => {
      const recipeCtx = createMockRecipeContext();
      render(<MixPropertiesChart recipes={recipeCtx.recipes} />);

      expect(capturedBarProps!.options.scales.y.beginAtZero).toBe(true);
    });

    it("should configure y-axis title to Quantity (%)", () => {
      const recipeCtx = createMockRecipeContext();
      render(<MixPropertiesChart recipes={recipeCtx.recipes} />);

      expect(capturedBarProps!.options.scales.y.title.display).toBe(true);
      expect(capturedBarProps!.options.scales.y.title.text).toBe("Quantity (%)");
    });
  });

  describe("Dataset Configuration", () => {
    it("should configure datasets with correct bar styling", () => {
      const recipeCtx = createMockRecipeContext();
      render(<MixPropertiesChart recipes={recipeCtx.recipes} />);

      expect(capturedBarProps).not.toBeNull();
      const dataset = capturedBarProps!.data.datasets[0];
      expect(dataset.maxBarThickness).toBe(40);
      expect(dataset.categoryPercentage).toBe(0.6);
      expect(dataset.barPercentage).toBe(0.8);
    });

    it("should set dataset colors for each recipe", () => {
      const recipeCtx = createMockRecipeContext([true, true, true]);
      render(<MixPropertiesChart recipes={recipeCtx.recipes} />);

      expect(capturedBarProps).not.toBeNull();
      capturedBarProps!.data.datasets.forEach((dataset, index) => {
        expect(dataset.backgroundColor).toBe(recipeChartColor(index));
        expect(dataset.borderColor).toBe(recipeChartColor(index));
      });
    });

    it("should set dataset color based on global recipe index", () => {
      const recipeCtx = createMockRecipeContext([true, false, true]);
      render(<MixPropertiesChart recipes={recipeCtx.recipes} />);

      expect(capturedBarProps).not.toBeNull();
      expect(capturedBarProps!.data.datasets).toHaveLength(2);
      expect(capturedBarProps!.data.datasets[0].backgroundColor).toBe(recipeChartColor(0));
      expect(capturedBarProps!.data.datasets[1].backgroundColor).toBe(recipeChartColor(2));
    });

    it("should create dataset for each visible recipe", () => {
      const recipeCtx = createMockRecipeContext([true, true, true]);
      render(<MixPropertiesChart recipes={recipeCtx.recipes} />);
      render(<MixPropertiesChart recipes={recipeCtx.recipes} />);
      expect(capturedBarProps).not.toBeNull();
      expect(capturedBarProps!.data.datasets).toHaveLength(3);
      expect(capturedBarProps!.data.datasets[0].label).toBe("Recipe");
      expect(capturedBarProps!.data.datasets[1].label).toBe("Ref 1");
      expect(capturedBarProps!.data.datasets[2].label).toBe("Ref 2");
    });

    it("should not crate dataset for empty reference recipes", () => {
      const recipeCtx = createMockRecipeContext([true, false, true]);
      render(<MixPropertiesChart recipes={recipeCtx.recipes} />);
      expect(capturedBarProps).not.toBeNull();
      expect(capturedBarProps!.data.datasets).toHaveLength(2);
      expect(capturedBarProps!.data.datasets[0].label).toBe("Recipe");
      expect(capturedBarProps!.data.datasets[1].label).toBe("Ref 2");
    });
  });

  describe("Data Values", () => {
    it("should handle zero and NaN property values", async () => {
      const recipeCtx = createMockRecipeContext();
      const { container } = render(<MixPropertiesChart recipes={recipeCtx.recipes} />);

      const filterSelect = container.querySelector("select") as HTMLSelectElement;
      expect(filterSelect).toBeInTheDocument();
      fireEvent.change(filterSelect, { target: { value: KeyFilter.All } });
      await waitFor(() => {
        expect(screen.getByText("All")).toBeInTheDocument();
      });

      expect(Math.abs(NaN)).toBeNaN();

      const EmulsPerFatPropKey = compToPropKey(CompKey.EmulsifiersPerFat);
      const AbsPACPropKey = compToPropKey(CompKey.AbsPAC);

      const captured = capturedBarProps!;
      expect(captured).not.toBeNull();
      expect(captured.data.labels.length).toBeGreaterThanOrEqual(getPropIndex(EmulsPerFatPropKey));
      expect(captured.data.labels.length).toBeGreaterThanOrEqual(getPropIndex(AbsPACPropKey));

      const mixProps = recipeCtx.recipes[0].mixProperties!;
      expect(mixProps.composition.get(CompKey.EmulsifiersPerFat)).toBeNaN();
      expect(mixProps.composition.get(CompKey.AbsPAC)).toBe(0);
      expect(getMixProperty(mixProps, EmulsPerFatPropKey)).toBeNaN();
      expect(getMixProperty(mixProps, AbsPACPropKey)).toBe(0);

      expect(capturedBarProps!.data.datasets[0].data[getPropIndex(EmulsPerFatPropKey)]).toBeNaN();
      expect(capturedBarProps!.data.datasets[0].data[getPropIndex(AbsPACPropKey)]).toBe(0);

      expect(capturedBarProps!.data.labels).toContain(getCompLabel(CompKey.EmulsifiersPerFat));
      expect(capturedBarProps!.data.labels).toContain(getCompLabel(CompKey.AbsPAC));
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty recipes array", () => {
      const recipes: Recipe[] = [];
      render(<MixPropertiesChart recipes={recipes} />);

      expect(capturedBarProps).not.toBeNull();
      expect(capturedBarProps!.data.datasets).toHaveLength(0);
    });
  });
});
