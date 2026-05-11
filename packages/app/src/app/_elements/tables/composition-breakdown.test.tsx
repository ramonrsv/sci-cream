import "@testing-library/jest-dom/vitest";

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

import { CompositionBreakdown, getCompKeys } from "@/app/_elements/tables/composition-breakdown";
import { QtyToggle } from "@/app/_elements/selects/qty-toggle-select";
import { applyQtyToggleAndFormat } from "@/lib/comp-value-format";
import { isCompKeyQuantity } from "@/lib/sci-cream/sci-cream";
import { RECIPE_TOTAL_ROWS } from "@/lib/styles/sizes";

import { CompKey } from "@workspace/sci-cream";

import { RecipeID, getLightRecipe } from "@/__tests__/assets";
import { makeMockRecipeContext, getCompColumnIdx } from "@/__tests__/unit/util";

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
      expect(container.querySelector("#ing-quantity-table")).toBeInTheDocument();
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
      expect(container.querySelector("#ing-composition-table")).toBeInTheDocument();
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
      const thead = container.querySelector("#ing-quantity-table thead")! as HTMLElement;
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
      const thead = container.querySelector("#ing-quantity-table thead")! as HTMLElement;
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
      const thead = container.querySelector("#ing-quantity-table thead")! as HTMLElement;
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
        "#ing-quantity-table thead tr:nth-child(2) td.comp-val",
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
        "#ing-quantity-table thead tr:nth-child(2) td.comp-val",
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
        "#ing-quantity-table thead tr:nth-child(2) td.comp-val",
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
      const tbody = container.querySelector("#ing-quantity-table tbody")!;
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
      const ingTable = within(container.querySelector("#ing-quantity-table tbody")!);
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
      const headers = container.querySelectorAll("#ing-composition-table thead tr:first-child th");
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
      const headers = container.querySelectorAll("#ing-composition-table thead tr:first-child th");
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
      const cells = container.querySelectorAll("#ing-composition-table tbody td.comp-val");
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
      const cells = container.querySelectorAll("#ing-composition-table tbody td.comp-val");
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
