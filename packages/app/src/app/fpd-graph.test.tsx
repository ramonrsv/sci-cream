"use client";

import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { Color, getColor } from "@/lib/styles/colors";
import { FpdGraph } from "@/app/fpd-graph";

import { RecipeID } from "@/__tests__/assets";
import { makeMockRecipe, makeMockRecipeContext } from "@/__tests__/unit/util";

// ---------------------------------------------------------------------------
// Test helpers, mocks, and setup
// ---------------------------------------------------------------------------

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

interface LineDataset {
  label: string;
  data: number[];
  borderWidth: number;
  borderColor: string;
  backgroundColor: unknown;
  borderDash?: number[];
  fill: string | false;
  pointRadius: number[];
  pointBackgroundColor: (string | undefined)[];
  pointBorderColor: string;
  pointBorderWidth: number;
}

interface CapturedLineProps {
  data: { labels: number[]; datasets: LineDataset[] };
  options: {
    responsive: boolean;
    maintainAspectRatio: boolean;
    color: string;
    plugins: {
      legend: { display: boolean; position: string; align: string };
      title: { display: boolean; text: string; color: string };
      tooltip: unknown;
    };
    scales: {
      x: { ticks: unknown; grid: unknown };
      y: {
        min: number;
        max: number;
        ticks: unknown;
        title: { display: boolean; text: string; color: string };
      };
    };
  };
}

let capturedLineProps: CapturedLineProps | null = null;

vi.mock("react-chartjs-2", () => ({
  Line: ({ data, options }: CapturedLineProps) => {
    capturedLineProps = { data, options };
    return <div data-testid="line-chart">Mocked Line Chart</div>;
  },
}));

// ---------------------------------------------------------------------------
// FpdGraph
// ---------------------------------------------------------------------------

describe("FpdGraph", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedLineProps = null;
    setupVitestCanvasMock();
  });

  afterEach(async () => {
    cleanup();
    await vi.waitFor(() => {}, { timeout: 100 });
  });

  // ---- Component Rendering --------------------------------------------------------------------

  describe("Component Rendering", () => {
    it("should render without crashing", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      render(<FpdGraph recipes={recipeCtx.recipes} />);
      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });

    it("should render with the correct container structure", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(<FpdGraph recipes={recipeCtx.recipes} />);
      expect(container.querySelector("#fpd-graph")).toBeInTheDocument();
      expect(container.querySelector(".grid-component")).toBeInTheDocument();
    });
  });

  // ---- Recipe Filtering -----------------------------------------------------------------------

  describe("Recipe Filtering", () => {
    it("should produce 2 datasets when only the main recipe is present", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      render(<FpdGraph recipes={recipeCtx.recipes} />);

      expect(capturedLineProps).not.toBeNull();
      expect(capturedLineProps!.data.datasets).toHaveLength(2);
    });

    it("should produce 4 datasets when main and one non-empty reference are present", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main, RecipeID.RefA]);
      render(<FpdGraph recipes={recipeCtx.recipes} />);

      expect(capturedLineProps).not.toBeNull();
      expect(capturedLineProps!.data.datasets).toHaveLength(4);
    });

    it("should produce 6 datasets when main and two non-empty references are present", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main, RecipeID.RefA, RecipeID.RefB]);
      render(<FpdGraph recipes={recipeCtx.recipes} />);

      expect(capturedLineProps).not.toBeNull();
      expect(capturedLineProps!.data.datasets).toHaveLength(6);
    });

    it("should exclude empty reference recipes from the graph", () => {
      // Only Main is populated; RefA and RefB remain empty
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      render(<FpdGraph recipes={recipeCtx.recipes} />);

      const labels = capturedLineProps!.data.datasets.map((d) => d.label);
      expect(labels.some((l) => l.includes("Ref"))).toBe(false);
    });

    it("should include only the non-empty reference when one reference is empty", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main, RecipeID.RefB]);
      render(<FpdGraph recipes={recipeCtx.recipes} />);

      expect(capturedLineProps!.data.datasets).toHaveLength(4);
      const labels = capturedLineProps!.data.datasets.map((d) => d.label);
      expect(labels.some((l) => l.includes("Ref A"))).toBe(false);
      expect(labels.some((l) => l.includes("Ref B"))).toBe(true);
    });
  });

  // ---- Dataset Labels -------------------------------------------------------------------------

  describe("Dataset Labels", () => {
    it("should label main recipe datasets without a name suffix", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      render(<FpdGraph recipes={recipeCtx.recipes} />);

      const labels = capturedLineProps!.data.datasets.map((d) => d.label);
      expect(labels).toContain("Hardness");
      expect(labels).toContain("Frozen Water");
    });

    it("should label reference recipe datasets with a recipe name suffix", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main, RecipeID.RefA]);
      render(<FpdGraph recipes={recipeCtx.recipes} />);

      const labels = capturedLineProps!.data.datasets.map((d) => d.label);
      expect(labels).toContain("Hardness (Ref A)");
      expect(labels).toContain("Frozen Water (Ref A)");
    });
  });

  // ---- Dataset Colors -------------------------------------------------------------------------

  describe("Dataset Colors", () => {
    it("should use GraphBlue for main recipe datasets", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      render(<FpdGraph recipes={recipeCtx.recipes} />);

      const expectedColor = getColor(Color.GraphBlue);
      capturedLineProps!.data.datasets.forEach((dataset) => {
        expect(dataset.borderColor).toBe(expectedColor);
      });
    });

    it("should use GraphGray for reference recipe datasets", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main, RecipeID.RefA]);
      render(<FpdGraph recipes={recipeCtx.recipes} />);

      const refDatasets = capturedLineProps!.data.datasets.filter((d) =>
        d.label.includes("(Ref A)"),
      );
      const expectedColor = getColor(Color.GraphGray);
      expect(refDatasets).toHaveLength(2);
      refDatasets.forEach((dataset) => {
        expect(dataset.borderColor).toBe(expectedColor);
      });
    });
  });

  // ---- Border Styles --------------------------------------------------------------------------

  describe("Border Styles", () => {
    it("should apply a dashed border to the Frozen Water dataset", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      render(<FpdGraph recipes={recipeCtx.recipes} />);

      const frozenWaterDataset = capturedLineProps!.data.datasets.find((d) =>
        d.label.startsWith("Frozen Water"),
      );
      expect(frozenWaterDataset).toBeDefined();
      expect(frozenWaterDataset!.borderDash).toEqual([3, 3]);
    });

    it("should not apply a dashed border to the Hardness dataset", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      render(<FpdGraph recipes={recipeCtx.recipes} />);

      const hardnessDataset = capturedLineProps!.data.datasets.find((d) =>
        d.label.startsWith("Hardness"),
      );
      expect(hardnessDataset).toBeDefined();
      expect(hardnessDataset!.borderDash).toBeUndefined();
    });

    it("should use a wider border for the main recipe than for references", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main, RecipeID.RefA]);
      render(<FpdGraph recipes={recipeCtx.recipes} />);

      const mainDatasets = capturedLineProps!.data.datasets.filter((d) => !d.label.includes("("));
      const refDatasets = capturedLineProps!.data.datasets.filter((d) =>
        d.label.includes("(Ref A)"),
      );

      mainDatasets.forEach((d) => expect(d.borderWidth).toBe(4));
      refDatasets.forEach((d) => expect(d.borderWidth).toBe(3));
    });
  });

  // ---- Fill Configuration ---------------------------------------------------------------------

  describe("Fill Configuration", () => {
    it("should fill the main recipe Hardness dataset from the start", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      render(<FpdGraph recipes={recipeCtx.recipes} />);

      const hardnessDataset = capturedLineProps!.data.datasets.find((d) => d.label === "Hardness");
      expect(hardnessDataset!.fill).toBe("start");
    });

    it("should not fill the main recipe Frozen Water dataset", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      render(<FpdGraph recipes={recipeCtx.recipes} />);

      const frozenWaterDataset = capturedLineProps!.data.datasets.find(
        (d) => d.label === "Frozen Water",
      );
      expect(frozenWaterDataset!.fill).toBe(false);
    });

    it("should not fill reference recipe datasets", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main, RecipeID.RefA]);
      render(<FpdGraph recipes={recipeCtx.recipes} />);

      const refDatasets = capturedLineProps!.data.datasets.filter((d) =>
        d.label.includes("(Ref A)"),
      );
      refDatasets.forEach((d) => expect(d.fill).toBe(false));
    });
  });

  // ---- Curve Data -----------------------------------------------------------------------------

  describe("Curve Data", () => {
    it("should produce 100 data points per dataset", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      render(<FpdGraph recipes={recipeCtx.recipes} />);

      capturedLineProps!.data.datasets.forEach((dataset) => {
        expect(dataset.data).toHaveLength(100);
      });
    });

    it("should map non-negative temperatures to NaN", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      render(<FpdGraph recipes={recipeCtx.recipes} />);

      capturedLineProps!.data.datasets.forEach((dataset) => {
        dataset.data.forEach((value) => {
          if (!Number.isNaN(value)) {
            expect(value).toBeLessThan(0);
          }
        });
      });
    });

    it("should have negative temperature values for a real recipe", () => {
      const recipe = makeMockRecipe(RecipeID.Main);
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      recipeCtx.recipes[0] = recipe;
      render(<FpdGraph recipes={recipeCtx.recipes} />);

      const hardnessDataset = capturedLineProps!.data.datasets.find((d) => d.label === "Hardness")!;
      const negativeValues = hardnessDataset.data.filter((v) => !Number.isNaN(v));
      expect(negativeValues.length).toBeGreaterThan(0);
      negativeValues.forEach((v) => expect(v).toBeLessThan(0));
    });
  });

  // ---- Point Highlighting ---------------------------------------------------------------------

  describe("Point Highlighting", () => {
    it("should highlight index 75 on the main recipe Hardness dataset", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      render(<FpdGraph recipes={recipeCtx.recipes} />);

      const hardnessDataset = capturedLineProps!.data.datasets.find((d) => d.label === "Hardness")!;
      expect(hardnessDataset.pointRadius[75]).toBe(6);
    });

    it("should not highlight index 75 on the Frozen Water dataset", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      render(<FpdGraph recipes={recipeCtx.recipes} />);

      const frozenWaterDataset = capturedLineProps!.data.datasets.find(
        (d) => d.label === "Frozen Water",
      )!;
      expect(frozenWaterDataset.pointRadius[75]).toBe(0);
    });

    it("should set pointRadius to 0 for all non-highlighted indices on the Hardness dataset", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      render(<FpdGraph recipes={recipeCtx.recipes} />);

      const hardnessDataset = capturedLineProps!.data.datasets.find((d) => d.label === "Hardness")!;
      hardnessDataset.pointRadius.forEach((r, i) => {
        if (i !== 75) expect(r).toBe(0);
      });
    });
  });

  // ---- X-Axis Labels --------------------------------------------------------------------------

  describe("X-Axis Labels", () => {
    it("should produce 101 x-axis labels covering 0 to 100", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      render(<FpdGraph recipes={recipeCtx.recipes} />);

      const labels = capturedLineProps!.data.labels;
      expect(labels).toHaveLength(101);
      expect(labels[0]).toBe(0);
      expect(labels[100]).toBe(100);
    });
  });

  // ---- Chart Options --------------------------------------------------------------------------

  describe("Chart Options", () => {
    it("should configure the chart title as 'FPD Graph'", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      render(<FpdGraph recipes={recipeCtx.recipes} />);

      expect(capturedLineProps!.options.plugins.title.display).toBe(true);
      expect(capturedLineProps!.options.plugins.title.text).toBe("FPD Graph");
    });

    it("should configure the chart as responsive without fixed aspect ratio", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      render(<FpdGraph recipes={recipeCtx.recipes} />);

      expect(capturedLineProps!.options.responsive).toBe(true);
      expect(capturedLineProps!.options.maintainAspectRatio).toBe(false);
    });

    it("should configure the y-axis with min -30 and max 0", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      render(<FpdGraph recipes={recipeCtx.recipes} />);

      expect(capturedLineProps!.options.scales.y.min).toBe(-30);
      expect(capturedLineProps!.options.scales.y.max).toBe(0);
    });

    it("should configure the y-axis title as 'Temperature (°C)'", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      render(<FpdGraph recipes={recipeCtx.recipes} />);

      expect(capturedLineProps!.options.scales.y.title.display).toBe(true);
      expect(capturedLineProps!.options.scales.y.title.text).toBe("Temperature (°C)");
    });
  });
});
