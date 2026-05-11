import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";

import { KeyFilter } from "@/app/_elements/selects/key-filter-select";
import { PropertiesChartView } from "@/app/_elements/charts/properties-chart-view";
import {
  getPropKeys,
  getModifiedMixProperty,
  propKeyAsModifiedMedStr,
} from "@/app/_elements/charts/properties-bar-chart";
import { filterActiveSlots } from "@/app/_components/recipe";

import {
  CompKey,
  FpdKey,
  compToPropKey,
  fpdToPropKey,
  getMixProperty,
  getPropKeys as getPropKeysAll,
} from "@workspace/sci-cream";

import { RecipeID } from "@/__tests__/assets";
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

interface CapturedChartProps {
  type: string;
  data: {
    labels: string[];
    datasets: Array<{ label: string; data: Array<{ y: number; yMin: number; yMax: number }> }>;
  };
}

let capturedBarProps: CapturedChartProps | null = null;

vi.mock("react-chartjs-2", () => ({
  Chart: ({ type, data }: CapturedChartProps) => {
    capturedBarProps = { type, data };
    return <div data-testid="bar-chart">Mocked Bar Chart</div>;
  },
}));

/** Convenience: build active recipes from a mock context and render the view with them */
function renderFromContext(recipeIds: RecipeID[]) {
  const recipeCtx = makeMockRecipeContext(recipeIds);
  const active = filterActiveSlots(recipeCtx.recipes);
  return { recipeCtx, ...render(<PropertiesChartView main={active[0]} refs={active.slice(1)} />) };
}

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

  // ---- Toolbar Rendering ----------------------------------------------------------------------

  describe("Toolbar Rendering", () => {
    it("should render KeyFilterSelect", () => {
      const { container } = renderFromContext([RecipeID.Main]);
      expect(container.querySelector("#key-filter-select")).toBeInTheDocument();
    });

    it("should render the underlying bar chart", () => {
      const { container } = renderFromContext([RecipeID.Main]);
      expect(container.querySelector('[data-testid="bar-chart"]')).toBeInTheDocument();
    });
  });

  // ---- Property Key Filtering -----------------------------------------------------------------

  describe("Property Key Filtering", () => {
    it("should default to KeyFilter.Auto", () => {
      const { container } = renderFromContext([RecipeID.Main]);
      const select = container.querySelector("#key-filter-select select") as HTMLSelectElement;
      expect(select).toBeInTheDocument();
      expect(select.value).toBe(KeyFilter.Auto);
    });

    it("should have some property keys selected by default", () => {
      renderFromContext([RecipeID.Main]);
      const labels = capturedBarProps!.data.labels;
      expect(labels.length).toBeGreaterThan(0);
      expect(labels).toContain(getCompLabel(CompKey.MilkFat));
    });

    it("should filter out Water and HardnessAt14C", () => {
      renderFromContext([RecipeID.Main]);
      const labels = capturedBarProps!.data.labels;
      expect(labels).not.toContain(getCompLabel(CompKey.Water));
      expect(labels).not.toContain(getFpdLabel(FpdKey.HardnessAt14C));
    });

    it("should show all labels if explicitly selected", async () => {
      const { container } = renderFromContext([]);
      expect(capturedBarProps!.data.labels.length).toBeGreaterThan(0);

      await configCustomKeysAll(container);

      await waitFor(() => {
        expect(capturedBarProps!.data.labels.length).toBe(getPropKeys().length);
      });
    });
  });

  // ---- Data Values ----------------------------------------------------------------------------

  describe("Data Values", () => {
    it("should handle zero and NaN property values", async () => {
      const { container, recipeCtx } = renderFromContext([]);

      await configCustomKeysAll(container);

      const EmulsPerFatPropKey = compToPropKey(CompKey.EmulsifiersPerFat);
      const AbsPACPropKey = compToPropKey(CompKey.AbsPAC);
      const EmulsPerFatLabel = propKeyAsModifiedMedStr(EmulsPerFatPropKey);
      const AbsPACLabel = propKeyAsModifiedMedStr(AbsPACPropKey);

      const data = capturedBarProps!.data;
      await waitFor(() => expect(data.labels.length).toBe(getPropKeysAll().length - 2));
      expect(data.labels).toContain(EmulsPerFatLabel);
      expect(data.labels).toContain(AbsPACLabel);

      const mixProps = recipeCtx.recipes[0].mixProperties!;
      expect(mixProps.composition.get(CompKey.EmulsifiersPerFat)).toBeNaN();
      expect(mixProps.composition.get(CompKey.AbsPAC)).toBe(0);
      expect(getMixProperty(mixProps, EmulsPerFatPropKey)).toBeNaN();
      expect(getMixProperty(mixProps, AbsPACPropKey)).toBe(0);

      expect(data.datasets[0].data[getPropIndex(data.labels, EmulsPerFatPropKey)].y).toBeNaN();
      expect(data.datasets[0].data[getPropIndex(data.labels, AbsPACPropKey)].y).toBe(0);
    });

    it("should have modified values and strings", async () => {
      const { container, recipeCtx } = renderFromContext([RecipeID.Main]);

      await configCustomKeysAll(container);

      const data = capturedBarProps!.data;
      await waitFor(() => expect(data.labels.length).toBe(getPropKeysAll().length - 2));

      for (const key of [
        compToPropKey(CompKey.EmulsifiersPerFat),
        compToPropKey(CompKey.StabilizersPerWater),
        compToPropKey(CompKey.AbsPAC),
        fpdToPropKey(FpdKey.ServingTemp),
      ]) {
        expect(data.labels).toContain(propKeyAsModifiedMedStr(key));
        expect(data.datasets[0].data[getPropIndex(data.labels, key)].y).toBeCloseTo(
          getModifiedMixProperty(recipeCtx.recipes[0].mixProperties!, key),
        );
      }
    });
  });
});
