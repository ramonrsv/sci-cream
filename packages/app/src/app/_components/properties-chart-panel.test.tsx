import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";

import { PropertiesChartPanel } from "@/app/_components/properties-chart-panel";

import { KeyFilter } from "@/app/_elements/selects/key-filter-select";
import { STORAGE_KEYS } from "@/lib/local-storage";
import { RecipeID } from "@/__tests__/assets";
import { makeMockRecipeContext, setKeyFilterSelect } from "@/__tests__/unit/util";
import { getSelectedOptionLabel } from "@/__tests__/unit/select";

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
  data: { datasets: Array<{ label: string }> };
}

let capturedBarProps: CapturedChartProps | null = null;

vi.mock("react-chartjs-2", () => ({
  Chart: ({ data }: CapturedChartProps) => {
    capturedBarProps = { data };
    return <div data-testid="bar-chart">Mocked Bar Chart</div>;
  },
}));

describe("PropertiesChartPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedBarProps = null;
    localStorage.clear();
    setupVitestCanvasMock();
  });

  afterEach(async () => {
    cleanup();
    await vi.waitFor(() => {}, { timeout: 100 });
  });

  // ---- Select persistence ---------------------------------------------------------------------

  describe("Select persistence", () => {
    const FILTER_KEY = `${STORAGE_KEYS.propertiesChartPanelView}:filter`;

    it("writes the KeyFilter leaf key when the select changes", async () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<PropertiesChartPanel recipes={recipeCtx.recipes} />);
      await act(async () => {});

      await setKeyFilterSelect(container, KeyFilter.Custom);
      await act(async () => {});

      expect(localStorage.getItem(FILTER_KEY)).toBe(JSON.stringify(KeyFilter.Custom));
    });

    it("restores the KeyFilter value on remount", async () => {
      localStorage.setItem(FILTER_KEY, JSON.stringify(KeyFilter.Custom));
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<PropertiesChartPanel recipes={recipeCtx.recipes} />);
      await act(async () => {});

      expect(getSelectedOptionLabel(container, "#key-filter-select")).toBe(KeyFilter.Custom);
    });
  });

  // ---- Panel Chrome ---------------------------------------------------------------------------

  describe("Panel Chrome", () => {
    it("should render with the correct id", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<PropertiesChartPanel recipes={recipeCtx.recipes} />);
      expect(container.querySelector("#properties-chart-panel")).toBeInTheDocument();
    });

    it("should render with the grid-component class", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<PropertiesChartPanel recipes={recipeCtx.recipes} />);
      expect(container.querySelector(".grid-component")).toBeInTheDocument();
    });

    it("should render a drag handle", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<PropertiesChartPanel recipes={recipeCtx.recipes} />);
      expect(container.querySelector(".drag-handle")).toBeInTheDocument();
    });
  });

  // ---- Slot Filtering -------------------------------------------------------------------------

  describe("Slot Filtering", () => {
    it("should display only the main recipe when all recipes are empty", () => {
      const recipeCtx = makeMockRecipeContext([]);
      render(<PropertiesChartPanel recipes={recipeCtx.recipes} />);
      expect(capturedBarProps!.data.datasets).toHaveLength(1);
      expect(capturedBarProps!.data.datasets[0].label).toBe("Recipe");
    });

    it("should display main recipe and non-empty reference recipes", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.RefB]);
      render(<PropertiesChartPanel recipes={recipeCtx.recipes} />);
      expect(capturedBarProps!.data.datasets).toHaveLength(2);
      expect(capturedBarProps!.data.datasets[0].label).toBe("Recipe");
      expect(capturedBarProps!.data.datasets[1].label).toBe("Ref B");
    });

    it("should exclude empty reference recipes", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main, RecipeID.RefB]);
      render(<PropertiesChartPanel recipes={recipeCtx.recipes} />);
      expect(capturedBarProps!.data.datasets).toHaveLength(2);
      const labels = capturedBarProps!.data.datasets.map((d) => d.label);
      expect(labels).not.toContain("Ref A");
    });
  });
});
