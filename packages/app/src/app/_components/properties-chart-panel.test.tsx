import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

import { PropertiesChartPanel } from "@/app/_components/properties-chart-panel";

import { RecipeID } from "@/__tests__/assets";
import { makeMockRecipeContext } from "@/__tests__/unit/util";

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

interface CapturedChartProps {
  data: { datasets: Array<{ label: string }> };
  options: { plugins: { rangeMeter: { refMarkers: Array<{ label: string }> } } };
}

let capturedBarProps: CapturedChartProps | null = null;

vi.mock("react-chartjs-2", () => ({
  Bar: ({ data, options }: CapturedChartProps) => {
    capturedBarProps = { data, options };
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
      expect(capturedBarProps!.options.plugins.rangeMeter.refMarkers).toHaveLength(0);
    });

    it("should display main recipe and non-empty reference recipes", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.RefB]);
      render(<PropertiesChartPanel recipes={recipeCtx.recipes} />);
      // The main recipe is the only bar dataset; references ride along as tick markers.
      expect(capturedBarProps!.data.datasets).toHaveLength(1);
      expect(capturedBarProps!.data.datasets[0].label).toBe("Recipe");
      const refMarkers = capturedBarProps!.options.plugins.rangeMeter.refMarkers;
      expect(refMarkers.map((r) => r.label)).toEqual(["Ref B"]);
    });

    it("should exclude empty reference recipes", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main, RecipeID.RefB]);
      render(<PropertiesChartPanel recipes={recipeCtx.recipes} />);
      expect(capturedBarProps!.data.datasets).toHaveLength(1);
      const refLabels = capturedBarProps!.options.plugins.rangeMeter.refMarkers.map((r) => r.label);
      expect(refLabels).not.toContain("Ref A");
      expect(refLabels).toEqual(["Ref B"]);
    });
  });
});
