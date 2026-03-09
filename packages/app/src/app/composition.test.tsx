import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within, act } from "@testing-library/react";

import { IngredientCompositionGrid, getCompKeys } from "@/app/composition";
import { QtyToggle } from "@/lib/ui/qty-toggle-select";
import { KeyFilter } from "@/lib/ui/key-filter-select";
import { applyQtyToggleAndFormat } from "@/lib/ui/comp-value-format";
import { isCompKeyQuantity } from "@/lib/sci-cream/sci-cream";
import { RECIPE_TOTAL_ROWS } from "@/lib/ui/constants";

import { CompKey, comp_key_as_med_str } from "@workspace/sci-cream";

import { RecipeID, getLightRecipe } from "@/__tests__/assets";
import {
  makeMockRecipeContext,
  getCompColumnIdx,
  setRecipeSelect,
  setKeyFilterSelect,
  setQtyToggle,
} from "@/__tests__/unit/util";

// ---------------------------------------------------------------------------
// Test helpers, mocks, and setup
// ---------------------------------------------------------------------------

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

// ---------------------------------------------------------------------------
// IngredientCompositionGrid component
// ---------------------------------------------------------------------------

describe("IngredientCompositionGrid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ---- Component Rendering ------------------------------------------------------------------

  describe("Component Rendering", () => {
    it("should render with the correct id", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      expect(container.querySelector("#ing-composition-grid")).toBeInTheDocument();
    });

    it("should render with the grid-component class", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      expect(container.querySelector(".grid-component")).toBeInTheDocument();
    });

    it("should render the ingredient quantity table", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      expect(container.querySelector("#ing-quantity-table")).toBeInTheDocument();
    });

    it("should render the ingredient composition table", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      expect(container.querySelector("#ing-composition-table")).toBeInTheDocument();
    });

    it("should render QtyToggleSelect", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      expect(container.querySelector("#qty-toggle-select")).toBeInTheDocument();
    });

    it("should render KeyFilterSelect", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      expect(container.querySelector("#key-filter-select")).toBeInTheDocument();
    });
  });

  // ---- Ingredient Table Structure ----------------------------------------------------------

  describe("Ingredient Table", () => {
    it('should show "Ingredient" as the first column header', () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      const thead = container.querySelector("#ing-quantity-table thead")! as HTMLElement;
      expect(within(thead).getByText("Ingredient")).toBeInTheDocument();
    });

    it('should show "Qty (g)" header in the default Quantity mode', () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      const thead = container.querySelector("#ing-quantity-table thead")! as HTMLElement;
      expect(within(thead).getByText("Qty (g)")).toBeInTheDocument();
    });

    it('should show "Qty (%)" header when QtyToggle is Percentage', async () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      await setQtyToggle(container, QtyToggle.Percentage);
      const thead = container.querySelector("#ing-quantity-table thead")! as HTMLElement;
      expect(within(thead).getByText("Qty (%)")).toBeInTheDocument();
    });

    it('should show "Total" in the totals row', () => {
      const recipeCtx = makeMockRecipeContext([]);
      render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      expect(screen.getByText("Total")).toBeInTheDocument();
    });

    it("should show the total qty in grams when the recipe has a mixTotal", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      const expectedTotal = recipeCtx.recipes[0].mixTotal!.toFixed(0);
      expect(expectedTotal).toBe("612");
      const totalQtyCell = container.querySelector(
        "#ing-quantity-table thead tr:nth-child(2) td.comp-val",
      )!;
      expect(totalQtyCell.textContent).toBe(expectedTotal);
    });

    it("should show an empty total qty cell when the recipe is empty", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      const totalQtyCell = container.querySelector(
        "#ing-quantity-table thead tr:nth-child(2) td.comp-val",
      )!;
      expect(totalQtyCell.textContent).toBe("");
    });

    it(`should render exactly ${RECIPE_TOTAL_ROWS} rows in the ingredient tbody`, () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      const tbody = container.querySelector("#ing-quantity-table tbody")!;
      expect(tbody.querySelectorAll("tr")).toHaveLength(RECIPE_TOTAL_ROWS);
    });

    it("should display ingredient names in the ingredient rows", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      const ingTable = within(container.querySelector("#ing-quantity-table tbody")!);
      const lightRecipe = getLightRecipe(RecipeID.Main);
      for (const [name] of lightRecipe) {
        expect(ingTable.getByText(name as string)).toBeInTheDocument();
      }
    });
  });

  // ---- QtyToggle Integration ---------------------------------------------------------------

  describe("QtyToggle Integration", () => {
    it("should default to QtyToggle.Quantity", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      const select = container.querySelector("#qty-toggle-select select") as HTMLSelectElement;
      expect(select.value).toBe(QtyToggle.Quantity);
    });

    it("should offer Composition, Quantity, and Percentage options", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      const select = container.querySelector("#qty-toggle-select select") as HTMLSelectElement;
      const options = Array.from(select.options).map((o) => o.value);
      expect(options).toContain(QtyToggle.Composition);
      expect(options).toContain(QtyToggle.Quantity);
      expect(options).toContain(QtyToggle.Percentage);
    });

    it('should show "100" for the total qty cell in Percentage mode', async () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      await setQtyToggle(container, QtyToggle.Percentage);
      const totalQtyCell = container.querySelector(
        "#ing-quantity-table thead tr:nth-child(2) td.comp-val",
      )!;
      expect(totalQtyCell.textContent?.trim()).toBe("100");
    });

    it("should update ingredient qty cells when toggled to Percentage", async () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);

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
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
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

  // ---- KeyFilter Integration ---------------------------------------------------------------

  describe("KeyFilter Integration", () => {
    it("should default to KeyFilter.Auto", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      const select = container.querySelector("#key-filter-select select") as HTMLSelectElement;
      expect(select.value).toBe(KeyFilter.Auto);
    });

    it("should show no composition columns in Auto mode when the recipe is empty", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      const headers = container.querySelectorAll("#ing-composition-table thead tr:first-child th");
      expect(headers).toHaveLength(0);
    });

    it("should show non-zero composition columns in Auto mode for a populated recipe", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      const headers = container.querySelectorAll("#ing-composition-table thead tr:first-child th");
      expect(headers.length).toBeGreaterThan(0);
      // MilkFat must appear since Whole Milk is in the recipe
      const headerTexts = Array.from(headers).map((th) => th.textContent);
      expect(headerTexts).toContain(comp_key_as_med_str(CompKey.MilkFat));
    });

    it("should show all comp key columns when KeyFilter is All", async () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      await setKeyFilterSelect(container, KeyFilter.All);
      const headers = container.querySelectorAll("#ing-composition-table thead tr:first-child th");
      expect(headers).toHaveLength(getCompKeys().length);
    });

    it("should show no columns with NonZero filter when the recipe is empty", async () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      await setKeyFilterSelect(container, KeyFilter.NonZero);
      const headers = container.querySelectorAll("#ing-composition-table thead tr:first-child th");
      expect(headers).toHaveLength(0);
    });
  });

  // ---- Recipe Selection --------------------------------------------------------------------

  describe("Recipe Selection", () => {
    it("should not show RecipeSelect when only the main recipe is visible", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      expect(container.querySelector("#recipe-selection")).not.toBeInTheDocument();
    });

    it("should show RecipeSelect when a non-empty reference recipe is present", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.RefA]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      expect(container.querySelector("#recipe-selection")).toBeInTheDocument();
    });

    it("should list non-empty recipe names in RecipeSelect", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main, RecipeID.RefA]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      const recipeSelect = container.querySelector("#recipe-selection select") as HTMLSelectElement;
      const options = Array.from(recipeSelect.options).map((o) => o.text);
      expect(options).toContain("Recipe");
      expect(options).toContain("Ref A");
      expect(options).not.toContain("Ref B");
    });

    it("if shown, RecipeSelect should list the main recipe even if empty", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.RefB]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      const recipeSelect = container.querySelector("#recipe-selection select") as HTMLSelectElement;
      const options = Array.from(recipeSelect.options).map((o) => o.text);
      expect(options).toContain("Recipe");
      expect(options).not.toContain("Ref A");
      expect(options).toContain("Ref B");
    });

    it("should update the displayed total when switching to a different recipe", async () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.RefA]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);

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
        <IngredientCompositionGrid recipes={populatedCtx.recipes} />,
      );

      await setRecipeSelect(container, RecipeID.RefA);

      // Clear Ref A by re-rendering with an empty recipe in its slot
      const clearedCtx = makeMockRecipeContext([]);
      act(() => rerender(<IngredientCompositionGrid recipes={clearedCtx.recipes} />));

      // RecipeSelect should remain because the cleared recipe is still the selected one
      expect(container.querySelector("#recipe-selection")).toBeInTheDocument();
    });

    it("should hide RecipeSelect after switching to main recipe when the reference is empty", async () => {
      const populatedCtx = makeMockRecipeContext([RecipeID.RefA]);
      const { container, rerender } = render(
        <IngredientCompositionGrid recipes={populatedCtx.recipes} />,
      );

      await setRecipeSelect(container, RecipeID.RefA);

      // Clear Ref A by re-rendering with an empty recipe in its slot
      const clearedCtx = makeMockRecipeContext([]);
      act(() => rerender(<IngredientCompositionGrid recipes={clearedCtx.recipes} />));

      await setRecipeSelect(container, RecipeID.Main);

      // RecipeSelect should now be hidden: only main recipe remains and it is selected
      expect(container.querySelector("#recipe-selection")).not.toBeInTheDocument();
    });
  });

  // ---- Composition Values ------------------------------------------------------------------

  describe("Composition Values", () => {
    it("should show empty comp cells for rows with no ingredient data", async () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      await setKeyFilterSelect(container, KeyFilter.All);
      const cells = container.querySelectorAll("#ing-composition-table tbody td.comp-val");
      cells.forEach((cell) => expect(cell.textContent).toBe(""));
    });

    it("should show non-empty values in the composition table for a populated recipe", async () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      await setKeyFilterSelect(container, KeyFilter.All);
      const cells = container.querySelectorAll("#ing-composition-table tbody td.comp-val");
      const nonEmptyCells = Array.from(cells).filter((c) => c.textContent?.trim() !== "");
      expect(nonEmptyCells.length).toBeGreaterThan(0);
    });

    it("should display the correct Quantity-mode value for MilkFat of the first ingredient", async () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      await setKeyFilterSelect(container, KeyFilter.All);

      const colIdx = getCompColumnIdx(container, CompKey.MilkFat);
      expect(colIdx).toBeGreaterThanOrEqual(0);

      const firstIngRow = container.querySelector("#ing-composition-table tbody tr:first-child")!;
      const cell = firstIngRow.querySelectorAll("td.comp-val")[colIdx];

      const firstRow = recipeCtx.recipes[0].ingredientRows[0];
      const expected = applyQtyToggleAndFormat(
        firstRow.ingredient!.composition!.get(CompKey.MilkFat),
        firstRow.quantity,
        recipeCtx.recipes[0].mixTotal,
        QtyToggle.Quantity,
        isCompKeyQuantity(CompKey.MilkFat),
      );
      expect(cell.textContent).toBe(expected);
    });

    it("should display the correct Composition-mode value for MilkFat of the first ingredient", async () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      await setKeyFilterSelect(container, KeyFilter.All);

      await setQtyToggle(container, QtyToggle.Composition);

      const colIdx = getCompColumnIdx(container, CompKey.MilkFat);
      const firstIngRow = container.querySelector("#ing-composition-table tbody tr:first-child")!;
      const cell = firstIngRow.querySelectorAll("td.comp-val")[colIdx];

      const firstRow = recipeCtx.recipes[0].ingredientRows[0];
      const expected = applyQtyToggleAndFormat(
        firstRow.ingredient!.composition!.get(CompKey.MilkFat),
        firstRow.quantity,
        recipeCtx.recipes[0].mixTotal,
        QtyToggle.Composition,
        isCompKeyQuantity(CompKey.MilkFat),
      );
      expect(cell.textContent).toBe(expected);
    });

    it("should display the correct total-row value for MilkFat in Quantity mode", async () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(<IngredientCompositionGrid recipes={recipeCtx.recipes} />);
      await setKeyFilterSelect(container, KeyFilter.All);

      const colIdx = getCompColumnIdx(container, CompKey.MilkFat);
      const totalRow = container.querySelector("#ing-composition-table thead tr:nth-child(2)")!;
      const cell = totalRow.querySelectorAll("td.comp-val")[colIdx];

      const mixProps = recipeCtx.recipes[0].mixProperties;
      const mixTotal = recipeCtx.recipes[0].mixTotal;
      const expected = applyQtyToggleAndFormat(
        mixProps.composition.get(CompKey.MilkFat),
        mixTotal,
        mixTotal,
        QtyToggle.Quantity,
        isCompKeyQuantity(CompKey.MilkFat),
      );
      expect(cell.textContent).toBe(expected);
    });
  });
});
