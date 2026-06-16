import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

import { CompositionBreakdownPanel } from "@/app/_components/composition-breakdown-panel";

import { makeMockRecipeContext } from "@/__tests__/unit/util";

describe("CompositionBreakdownPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  // ---- Panel Chrome -----------------------------------------------------------------------

  describe("Panel Chrome", () => {
    it("should render with the correct id", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<CompositionBreakdownPanel recipes={recipeCtx.recipes} />);
      expect(container.querySelector("#composition-breakdown-panel")).toBeInTheDocument();
    });

    it("should render with the grid-component class", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<CompositionBreakdownPanel recipes={recipeCtx.recipes} />);
      expect(container.querySelector(".grid-component")).toBeInTheDocument();
    });

    it("should render a drag handle", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<CompositionBreakdownPanel recipes={recipeCtx.recipes} />);
      expect(container.querySelector(".drag-handle")).toBeInTheDocument();
    });

    it("should render the underlying view", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<CompositionBreakdownPanel recipes={recipeCtx.recipes} />);
      expect(container.querySelector("#composition-breakdown-recipe-table")).toBeInTheDocument();
      expect(container.querySelector("#composition-breakdown-table")).toBeInTheDocument();
    });
  });
});
