import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within, act } from "@testing-library/react";

import {
  CompositionBreakdown,
  CompositionBreakdownView,
  getCompKeys,
} from "@/app/_elements/tables/composition-breakdown";
import { QtyToggle, qtyToggleToShortStr } from "@/app/_elements/selects/qty-toggle-select";
import { KeyFilter } from "@/app/_elements/selects/key-filter-select";
import { getSelectedOptionLabel, getSelectOptionLabels } from "@/__tests__/unit/select";
import { applyQtyToggleAndFormat } from "@/lib/comp-value-format";
import { RECIPE_TOTAL_ROWS } from "@/lib/styles/sizes";

import { CompKey, comp_key_as_med_str } from "@workspace/sci-cream";

import { RecipeID, getLightRecipe } from "@/__tests__/assets";
import {
  makeMockRecipeContext,
  getCompColumnIdx,
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

describe("CompositionBreakdown", () => {
  afterEach(() => {
    cleanup();
  });

  // ---- Structure --------------------------------------------------------------------------

  describe("Structure", () => {
    it("should render the ingredient quantity table", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(
        <CompositionBreakdown
          recipe={recipeCtx.recipes[0]}
          compKeys={getCompKeys()}
          qtyToggle={QtyToggle.Quantity}
        />,
      );
      expect(container.querySelector("#composition-breakdown-recipe-table")).toBeInTheDocument();
    });

    it("should render the ingredient composition table", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(
        <CompositionBreakdown
          recipe={recipeCtx.recipes[0]}
          compKeys={getCompKeys()}
          qtyToggle={QtyToggle.Quantity}
        />,
      );
      expect(container.querySelector("#composition-breakdown-table")).toBeInTheDocument();
    });
  });

  // ---- Ingredient Table ---------------------------------------------------------------------

  describe("Ingredient Table", () => {
    it('should show "Ingredient" as the first column header', () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(
        <CompositionBreakdown
          recipe={recipeCtx.recipes[0]}
          compKeys={[]}
          qtyToggle={QtyToggle.Quantity}
        />,
      );
      const thead = container.querySelector(
        "#composition-breakdown-recipe-table thead",
      )! as HTMLElement;
      expect(within(thead).getByText("Ingredient")).toBeInTheDocument();
    });

    it('should show "Qty (g)" header in Quantity mode', () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(
        <CompositionBreakdown
          recipe={recipeCtx.recipes[0]}
          compKeys={[]}
          qtyToggle={QtyToggle.Quantity}
        />,
      );
      const thead = container.querySelector(
        "#composition-breakdown-recipe-table thead",
      )! as HTMLElement;
      expect(within(thead).getByText("Qty (g)")).toBeInTheDocument();
    });

    it('should show "Qty (%)" header in Percentage mode', () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(
        <CompositionBreakdown
          recipe={recipeCtx.recipes[0]}
          compKeys={[]}
          qtyToggle={QtyToggle.Percentage}
        />,
      );
      const thead = container.querySelector(
        "#composition-breakdown-recipe-table thead",
      )! as HTMLElement;
      expect(within(thead).getByText("Qty (%)")).toBeInTheDocument();
    });

    it('should show "Total" in the totals row', () => {
      const recipeCtx = makeMockRecipeContext([]);
      render(
        <CompositionBreakdown
          recipe={recipeCtx.recipes[0]}
          compKeys={[]}
          qtyToggle={QtyToggle.Quantity}
        />,
      );
      expect(screen.getByText("Total")).toBeInTheDocument();
    });

    it("should show the total qty in grams when the recipe has a mixTotal", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(
        <CompositionBreakdown
          recipe={recipeCtx.recipes[0]}
          compKeys={[]}
          qtyToggle={QtyToggle.Quantity}
        />,
      );
      const expectedTotal = recipeCtx.recipes[0].mixTotal!.toFixed(0);
      expect(expectedTotal).toBe("612");
      const totalQtyCell = container.querySelector(
        "#composition-breakdown-recipe-table thead tr:nth-child(2) td.comp-val",
      )!;
      expect(totalQtyCell.textContent).toBe(expectedTotal);
    });

    it("should show an empty total qty cell when the recipe is empty", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(
        <CompositionBreakdown
          recipe={recipeCtx.recipes[0]}
          compKeys={[]}
          qtyToggle={QtyToggle.Quantity}
        />,
      );
      const totalQtyCell = container.querySelector(
        "#composition-breakdown-recipe-table thead tr:nth-child(2) td.comp-val",
      )!;
      expect(totalQtyCell.textContent).toBe("");
    });

    it('should show "100" for the total qty cell in Percentage mode', () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(
        <CompositionBreakdown
          recipe={recipeCtx.recipes[0]}
          compKeys={[]}
          qtyToggle={QtyToggle.Percentage}
        />,
      );
      const totalQtyCell = container.querySelector(
        "#composition-breakdown-recipe-table thead tr:nth-child(2) td.comp-val",
      )!;
      expect(totalQtyCell.textContent?.trim()).toBe("100");
    });

    it(`should render one row per ingredientRow in the tbody`, () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(
        <CompositionBreakdown
          recipe={recipeCtx.recipes[0]}
          compKeys={[]}
          qtyToggle={QtyToggle.Quantity}
        />,
      );
      const tbody = container.querySelector("#composition-breakdown-recipe-table tbody")!;
      expect(tbody.querySelectorAll("tr")).toHaveLength(RECIPE_TOTAL_ROWS);
    });

    it("should display ingredient names in the ingredient rows", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(
        <CompositionBreakdown
          recipe={recipeCtx.recipes[0]}
          compKeys={[]}
          qtyToggle={QtyToggle.Quantity}
        />,
      );
      const ingTable = within(
        container.querySelector("#composition-breakdown-recipe-table tbody")!,
      );
      const lightRecipe = getLightRecipe(RecipeID.Main);
      for (const [name] of lightRecipe) {
        expect(ingTable.getByText(name as string)).toBeInTheDocument();
      }
    });
  });

  // ---- Composition Table ---------------------------------------------------------------------

  describe("Composition Table", () => {
    it("should render one header column per provided compKey", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const compKeys = [CompKey.MilkFat, CompKey.TotalFats, CompKey.MSNF];
      const { container } = render(
        <CompositionBreakdown
          recipe={recipeCtx.recipes[0]}
          compKeys={compKeys}
          qtyToggle={QtyToggle.Quantity}
        />,
      );
      const headers = container.querySelectorAll(
        "#composition-breakdown-table thead tr:first-child th",
      );
      expect(headers).toHaveLength(compKeys.length);
    });

    it("should render no header columns when compKeys is empty", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(
        <CompositionBreakdown
          recipe={recipeCtx.recipes[0]}
          compKeys={[]}
          qtyToggle={QtyToggle.Quantity}
        />,
      );
      const headers = container.querySelectorAll(
        "#composition-breakdown-table thead tr:first-child th",
      );
      expect(headers).toHaveLength(0);
    });
  });

  // ---- Composition Values --------------------------------------------------------------------

  describe("Composition Values", () => {
    it("should show empty comp cells for rows with no ingredient data", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(
        <CompositionBreakdown
          recipe={recipeCtx.recipes[0]}
          compKeys={getCompKeys()}
          qtyToggle={QtyToggle.Quantity}
        />,
      );
      const cells = container.querySelectorAll("#composition-breakdown-table tbody td.comp-val");
      cells.forEach((cell) => expect(cell.textContent).toBe(""));
    });

    it("should show non-empty values for a populated recipe", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(
        <CompositionBreakdown
          recipe={recipeCtx.recipes[0]}
          compKeys={getCompKeys()}
          qtyToggle={QtyToggle.Quantity}
        />,
      );
      const cells = container.querySelectorAll("#composition-breakdown-table tbody td.comp-val");
      const nonEmptyCells = Array.from(cells).filter((c) => c.textContent?.trim() !== "");
      expect(nonEmptyCells.length).toBeGreaterThan(0);
    });

    it("should display the correct Quantity-mode value for MilkFat of the first ingredient", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(
        <CompositionBreakdown
          recipe={recipeCtx.recipes[0]}
          compKeys={getCompKeys()}
          qtyToggle={QtyToggle.Quantity}
        />,
      );

      const colIdx = getCompColumnIdx(container, CompKey.MilkFat);
      expect(colIdx).toBeGreaterThanOrEqual(0);

      const firstIngRow = container.querySelector(
        "#composition-breakdown-table tbody tr:first-child",
      )!;
      const cell = firstIngRow.querySelectorAll("td.comp-val")[colIdx];

      const firstRow = recipeCtx.recipes[0].ingredientRows[0];
      const expected = applyQtyToggleAndFormat(
        firstRow.ingredient!.composition!.get(CompKey.MilkFat),
        firstRow.quantity,
        recipeCtx.recipes[0].mixTotal,
        QtyToggle.Quantity,
        true,
      );
      expect(cell.textContent).toBe(expected);
    });

    it("should display the correct Composition-mode value for MilkFat of the first ingredient", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(
        <CompositionBreakdown
          recipe={recipeCtx.recipes[0]}
          compKeys={getCompKeys()}
          qtyToggle={QtyToggle.Composition}
        />,
      );

      const colIdx = getCompColumnIdx(container, CompKey.MilkFat);
      const firstIngRow = container.querySelector(
        "#composition-breakdown-table tbody tr:first-child",
      )!;
      const cell = firstIngRow.querySelectorAll("td.comp-val")[colIdx];

      const firstRow = recipeCtx.recipes[0].ingredientRows[0];
      const expected = applyQtyToggleAndFormat(
        firstRow.ingredient!.composition!.get(CompKey.MilkFat),
        firstRow.quantity,
        recipeCtx.recipes[0].mixTotal,
        QtyToggle.Composition,
        true,
      );
      expect(cell.textContent).toBe(expected);
    });

    it("should display the correct total-row value for MilkFat in Quantity mode", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(
        <CompositionBreakdown
          recipe={recipeCtx.recipes[0]}
          compKeys={getCompKeys()}
          qtyToggle={QtyToggle.Quantity}
        />,
      );

      const colIdx = getCompColumnIdx(container, CompKey.MilkFat);
      const totalRow = container.querySelector(
        "#composition-breakdown-table thead tr:nth-child(2)",
      )!;
      const cell = totalRow.querySelectorAll("td.comp-val")[colIdx];

      const mixProps = recipeCtx.recipes[0].mixProperties;
      const mixTotal = recipeCtx.recipes[0].mixTotal;
      const expected = applyQtyToggleAndFormat(
        mixProps.composition.get(CompKey.MilkFat),
        mixTotal,
        mixTotal,
        QtyToggle.Quantity,
        true,
      );
      expect(cell.textContent).toBe(expected);
    });
  });
});

// ---------------------------------------------------------------------------
// CompositionBreakdownView (toolbar + bare)
// ---------------------------------------------------------------------------

describe("CompositionBreakdownView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

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
      expect(container.querySelector("#composition-breakdown-recipe-table")).toBeInTheDocument();
      expect(container.querySelector("#composition-breakdown-table")).toBeInTheDocument();
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

  describe("QtyToggle Integration", () => {
    it("should default to QtyToggle.Quantity", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);
      expect(getSelectedOptionLabel(container, "#qty-toggle-select")).toBe(
        qtyToggleToShortStr(QtyToggle.Quantity),
      );
    });

    it("should offer Composition, Quantity, and Percentage options", async () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);
      const labels = await getSelectOptionLabels(container, "#qty-toggle-select");
      expect(labels).toContain(qtyToggleToShortStr(QtyToggle.Composition));
      expect(labels).toContain(qtyToggleToShortStr(QtyToggle.Quantity));
      expect(labels).toContain(qtyToggleToShortStr(QtyToggle.Percentage));
    });

    it("should update ingredient qty cells when toggled to Percentage", async () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);

      const getQtyCells = () =>
        Array.from(
          container.querySelectorAll("#composition-breakdown-recipe-table tbody td.comp-val"),
        ).map((td) => td.textContent);

      const quantityValues = getQtyCells();
      await setQtyToggle(container, QtyToggle.Percentage);
      expect(getQtyCells()).not.toEqual(quantityValues);
    });

    it("should update composition cells when toggled from Quantity to Composition", async () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);
      await setKeyFilterSelect(container, KeyFilter.All);

      const getCompCells = () =>
        Array.from(
          container.querySelectorAll("#composition-breakdown-table tbody td.comp-val"),
        ).map((td) => td.textContent);

      const quantityValues = getCompCells();

      await setQtyToggle(container, QtyToggle.Composition);
      expect(getCompCells()).not.toEqual(quantityValues);
    });
  });

  describe("KeyFilter Integration", () => {
    it("should default to KeyFilter.Auto", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);
      expect(getSelectedOptionLabel(container, "#key-filter-select")).toBe(KeyFilter.Auto);
    });

    it("should show no composition columns in Auto mode when the recipe is empty", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);
      const headers = container.querySelectorAll(
        "#composition-breakdown-table thead tr:first-child th",
      );
      expect(headers).toHaveLength(0);
    });

    it("should show non-zero composition columns in Auto mode for a populated recipe", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);
      const headers = container.querySelectorAll(
        "#composition-breakdown-table thead tr:first-child th",
      );
      expect(headers.length).toBeGreaterThan(0);
      const headerTexts = Array.from(headers).map((th) => th.textContent);
      expect(headerTexts).toContain(comp_key_as_med_str(CompKey.MilkFat));
    });

    it("should show all comp key columns when KeyFilter is All", async () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);
      await setKeyFilterSelect(container, KeyFilter.All);
      const headers = container.querySelectorAll(
        "#composition-breakdown-table thead tr:first-child th",
      );
      expect(headers).toHaveLength(getCompKeys().length);
    });

    it("should show no columns with NonZero filter when the recipe is empty", async () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);
      await setKeyFilterSelect(container, KeyFilter.NonZero);
      const headers = container.querySelectorAll(
        "#composition-breakdown-table thead tr:first-child th",
      );
      expect(headers).toHaveLength(0);
    });
  });

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

    it("should list non-empty recipe names in RecipeSelect", async () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main, RecipeID.RefA]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);
      const options = await getSelectOptionLabels(container, "#recipe-selection");
      expect(options).toContain("Recipe");
      expect(options).toContain("Ref A");
      expect(options).not.toContain("Ref B");
    });

    it("if shown, RecipeSelect should list the main recipe even if empty", async () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.RefB]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);
      const options = await getSelectOptionLabels(container, "#recipe-selection");
      expect(options).toContain("Recipe");
      expect(options).not.toContain("Ref A");
      expect(options).toContain("Ref B");
    });

    it("should update the displayed total when switching to a different recipe", async () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.RefA]);
      const { container } = render(<CompositionBreakdownView recipes={recipeCtx.recipes} />);

      const totalQtyCell = () =>
        container.querySelector(
          "#composition-breakdown-recipe-table thead tr:nth-child(2) td.comp-val",
        )!;
      expect(totalQtyCell().textContent).toBe("");

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
