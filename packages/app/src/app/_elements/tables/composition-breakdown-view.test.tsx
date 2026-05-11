import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";

import { CompositionBreakdownView } from "@/app/_elements/tables/composition-breakdown-view";
import { getCompKeys } from "@/app/_elements/tables/composition-breakdown";
import { QtyToggle } from "@/app/_elements/selects/qty-toggle-select";
import { KeyFilter } from "@/app/_elements/selects/key-filter-select";

import { CompKey, comp_key_as_med_str } from "@workspace/sci-cream";

import { RecipeID } from "@/__tests__/assets";
import {
  makeMockRecipeContext,
  setRecipeSelect,
  setKeyFilterSelect,
  setQtyToggle,
} from "@/__tests__/unit/util";

/** Mock implementation of ResizeObserver for testing purposes */
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

describe("CompositionBreakdownView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ---- Toolbar Rendering ------------------------------------------------------------------

  describe("Toolbar Rendering", () => {
    it("should render QtyToggleSelect", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);
      expect(container.querySelector("#qty-toggle-select")).toBeInTheDocument();
    });

    it("should render KeyFilterSelect", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);
      expect(container.querySelector("#key-filter-select")).toBeInTheDocument();
    });

    it("should render the underlying breakdown tables", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);
      expect(container.querySelector("#ing-quantity-table")).toBeInTheDocument();
      expect(container.querySelector("#ing-composition-table")).toBeInTheDocument();
    });

    it("should render the toolbarPrefix inside the toolbar row", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(
        <CompositionBreakdownView
          recipes={recipeCtx.recipes}
          toolbarPrefix={<span data-testid="prefix" />}
        />,
      );
      expect(container.querySelector('[data-testid="prefix"]')).toBeInTheDocument();
    });
  });

  // ---- QtyToggle Integration --------------------------------------------------------------

  describe("QtyToggle Integration", () => {
    it("should default to QtyToggle.Quantity", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);
      const select = container.querySelector("#qty-toggle-select select") as HTMLSelectElement;
      expect(select.value).toBe(QtyToggle.Quantity);
    });

    it("should offer Composition, Quantity, and Percentage options", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);
      const select = container.querySelector("#qty-toggle-select select") as HTMLSelectElement;
      const options = Array.from(select.options).map((o) => o.value);
      expect(options).toContain(QtyToggle.Composition);
      expect(options).toContain(QtyToggle.Quantity);
      expect(options).toContain(QtyToggle.Percentage);
    });

    it("should update ingredient qty cells when toggled to Percentage", async () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);

      const getQtyCells = () =>
        Array.from(container.querySelectorAll("#ing-quantity-table tbody td.comp-val")).map(
          (td) => td.textContent,
        );

      const quantityValues = getQtyCells();
      await setQtyToggle(container, QtyToggle.Percentage);
      expect(getQtyCells()).not.toEqual(quantityValues);
    });

    it("should update composition cells when toggled from Quantity to Composition", async () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);
      await setKeyFilterSelect(container, KeyFilter.All);

      const getCompCells = () =>
        Array.from(container.querySelectorAll("#ing-composition-table tbody td.comp-val")).map(
          (td) => td.textContent,
        );

      const quantityValues = getCompCells();

      await setQtyToggle(container, QtyToggle.Composition);
      expect(getCompCells()).not.toEqual(quantityValues);
    });
  });

  // ---- KeyFilter Integration --------------------------------------------------------------

  describe("KeyFilter Integration", () => {
    it("should default to KeyFilter.Auto", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);
      const select = container.querySelector("#key-filter-select select") as HTMLSelectElement;
      expect(select.value).toBe(KeyFilter.Auto);
    });

    it("should show no composition columns in Auto mode when the recipe is empty", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);
      const headers = container.querySelectorAll("#ing-composition-table thead tr:first-child th");
      expect(headers).toHaveLength(0);
    });

    it("should show non-zero composition columns in Auto mode for a populated recipe", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);
      const headers = container.querySelectorAll("#ing-composition-table thead tr:first-child th");
      expect(headers.length).toBeGreaterThan(0);
      const headerTexts = Array.from(headers).map((th) => th.textContent);
      expect(headerTexts).toContain(comp_key_as_med_str(CompKey.MilkFat));
    });

    it("should show all comp key columns when KeyFilter is All", async () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);
      await setKeyFilterSelect(container, KeyFilter.All);
      const headers = container.querySelectorAll("#ing-composition-table thead tr:first-child th");
      expect(headers).toHaveLength(getCompKeys().length);
    });

    it("should show no columns with NonZero filter when the recipe is empty", async () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);
      await setKeyFilterSelect(container, KeyFilter.NonZero);
      const headers = container.querySelectorAll("#ing-composition-table thead tr:first-child th");
      expect(headers).toHaveLength(0);
    });
  });

  // ---- Recipe Selection -------------------------------------------------------------------

  describe("Recipe Selection", () => {
    it("should not show RecipeSelect when only the main recipe is visible", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);
      expect(container.querySelector("#recipe-selection")).not.toBeInTheDocument();
    });

    it("should show RecipeSelect when a non-empty reference recipe is present", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.RefA]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);
      expect(container.querySelector("#recipe-selection")).toBeInTheDocument();
    });

    it("should list non-empty recipe names in RecipeSelect", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main, RecipeID.RefA]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);
      const recipeSelect = container.querySelector("#recipe-selection select") as HTMLSelectElement;
      const options = Array.from(recipeSelect.options).map((o) => o.text);
      expect(options).toContain("Recipe");
      expect(options).toContain("Ref A");
      expect(options).not.toContain("Ref B");
    });

    it("if shown, RecipeSelect should list the main recipe even if empty", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.RefB]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);
      const recipeSelect = container.querySelector("#recipe-selection select") as HTMLSelectElement;
      const options = Array.from(recipeSelect.options).map((o) => o.text);
      expect(options).toContain("Recipe");
      expect(options).not.toContain("Ref A");
      expect(options).toContain("Ref B");
    });

    it("should update the displayed total when switching to a different recipe", async () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.RefA]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);

      // Initially on the main recipe (empty -> total is "")
      const totalQtyCell = () =>
        container.querySelector("#ing-quantity-table thead tr:nth-child(2) td.comp-val")!;
      expect(totalQtyCell().textContent).toBe("");

      // Switch to Ref A (index 1, mixTotal = 603)
      await setRecipeSelect(container, RecipeID.RefA);
      expect(totalQtyCell().textContent).toBe("603");
    });

    it("should keep RecipeSelect visible when the selected reference recipe is cleared", async () => {
      const populatedCtx = makeMockRecipeContext([RecipeID.RefA]);
      const { container, rerender } = render(
        <CompositionBreakdownView recipes={populatedCtx.recipes} />,
      );

      await setRecipeSelect(container, RecipeID.RefA);

      const clearedCtx = makeMockRecipeContext([]);
      act(() => rerender(<CompositionBreakdownView recipes={clearedCtx.recipes} />));

      expect(container.querySelector("#recipe-selection")).toBeInTheDocument();
    });

    it("should hide RecipeSelect after switching to main recipe when the reference is empty", async () => {
      const populatedCtx = makeMockRecipeContext([RecipeID.RefA]);
      const { container, rerender } = render(
        <CompositionBreakdownView recipes={populatedCtx.recipes} />,
      );

      await setRecipeSelect(container, RecipeID.RefA);

      const clearedCtx = makeMockRecipeContext([]);
      act(() => rerender(<CompositionBreakdownView recipes={clearedCtx.recipes} />));

      await setRecipeSelect(container, RecipeID.Main);

      expect(container.querySelector("#recipe-selection")).not.toBeInTheDocument();
    });
  });
});
