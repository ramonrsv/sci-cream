import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

import { PropertiesPanel } from "@/app/_components/properties-panel";

import { makeMockRecipeContext } from "@/__tests__/unit/util";
import { RecipeID } from "@/__tests__/assets";

/** Mock implementation of ResizeObserver for testing purposes */
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

describe("PropertiesPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ---- Panel Chrome -----------------------------------------------------------------------

  describe("Panel Chrome", () => {
    it("should render with the correct id", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<PropertiesPanel recipes={recipeCtx.recipes} />);
      expect(container.querySelector("#properties-panel")).toBeInTheDocument();
    });

    it("should render with the grid-component class", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<PropertiesPanel recipes={recipeCtx.recipes} />);
      expect(container.querySelector(".grid-component")).toBeInTheDocument();
    });

    it("should render a drag handle", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<PropertiesPanel recipes={recipeCtx.recipes} />);
      expect(container.querySelector(".drag-handle")).toBeInTheDocument();
    });
  });

  // ---- Slot Filtering ---------------------------------------------------------------------

  describe("Slot Filtering", () => {
    it("should show only the main recipe column when all recipes are empty", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<PropertiesPanel recipes={recipeCtx.recipes} />);
      // "Property" + "Recipe" = 2 header cells
      expect(container.querySelectorAll("thead th")).toHaveLength(2);
      expect(screen.getByText("Recipe")).toBeInTheDocument();
    });

    it("should always show the main recipe even when it is empty", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<PropertiesPanel recipes={recipeCtx.recipes} />);
      const thead = container.querySelector("thead")!;
      expect(within(thead).getByText("Recipe")).toBeInTheDocument();
    });

    it("should show main recipe and non-empty reference recipe columns", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.RefB]);
      const { container } = render(<PropertiesPanel recipes={recipeCtx.recipes} />);
      // "Property" + "Recipe" + "Ref B" = 3 header cells
      expect(container.querySelectorAll("thead th")).toHaveLength(3);
      expect(screen.getByText("Recipe")).toBeInTheDocument();
      expect(screen.getByText("Ref B")).toBeInTheDocument();
    });

    it("should show all non-empty reference recipes", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.RefA, RecipeID.RefB]);
      const { container } = render(<PropertiesPanel recipes={recipeCtx.recipes} />);
      // "Property" + "Recipe" + "Ref A" + "Ref B" = 4 header cells
      expect(container.querySelectorAll("thead th")).toHaveLength(4);
      expect(screen.getByText("Recipe")).toBeInTheDocument();
      expect(screen.getByText("Ref A")).toBeInTheDocument();
      expect(screen.getByText("Ref B")).toBeInTheDocument();
    });

    it("should not show empty reference recipe columns", () => {
      const recipeCtx = makeMockRecipeContext([]);
      render(<PropertiesPanel recipes={recipeCtx.recipes} />);
      expect(screen.queryByText("Ref A")).not.toBeInTheDocument();
      expect(screen.queryByText("Ref B")).not.toBeInTheDocument();
    });
  });
});
