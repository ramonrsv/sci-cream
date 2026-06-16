"use client";

import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

import { FpdGraphPanel } from "@/app/_components/fpd-graph-panel";

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

vi.mock("chartjs-chart-error-bars", () => ({
  BarWithErrorBarsController: vi.fn(),
  BarWithErrorBar: vi.fn(),
}));

interface LineDataset {
  label: string;
}

interface CapturedLineProps {
  data: { labels: number[]; datasets: LineDataset[] };
}

let capturedLineProps: CapturedLineProps | null = null;

vi.mock("react-chartjs-2", () => ({
  Line: ({ data }: CapturedLineProps) => {
    capturedLineProps = { data };
    return <div data-testid="line-chart">Mocked Line Chart</div>;
  },
}));

describe("FpdGraphPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedLineProps = null;
    setupVitestCanvasMock();
  });

  afterEach(async () => {
    cleanup();
    await vi.waitFor(() => {}, { timeout: 100 });
  });

  // ---- Panel Chrome ---------------------------------------------------------------------------

  describe("Panel Chrome", () => {
    it("should render with the correct id", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(<FpdGraphPanel recipes={recipeCtx.recipes} />);
      expect(container.querySelector("#fpd-graph-panel")).toBeInTheDocument();
    });

    it("should render with the grid-component class", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(<FpdGraphPanel recipes={recipeCtx.recipes} />);
      expect(container.querySelector(".grid-component")).toBeInTheDocument();
    });

    it("should render a drag handle", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(<FpdGraphPanel recipes={recipeCtx.recipes} />);
      expect(container.querySelector(".drag-handle")).toBeInTheDocument();
    });
  });

  // ---- Slot Filtering -------------------------------------------------------------------------

  describe("Slot Filtering", () => {
    it("should exclude empty reference recipes from the graph", () => {
      // Only Main is populated; RefA and RefB remain empty
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      render(<FpdGraphPanel recipes={recipeCtx.recipes} />);
      const labels = capturedLineProps!.data.datasets.map((d) => d.label);
      expect(labels.some((l) => l.includes("Ref"))).toBe(false);
    });

    it("should include only the non-empty reference when one reference is empty", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main, RecipeID.RefB]);
      render(<FpdGraphPanel recipes={recipeCtx.recipes} />);
      expect(capturedLineProps!.data.datasets).toHaveLength(4);
      const labels = capturedLineProps!.data.datasets.map((d) => d.label);
      expect(labels.some((l) => l.includes("Ref A"))).toBe(false);
      expect(labels.some((l) => l.includes("Ref B"))).toBe(true);
    });
  });
});
