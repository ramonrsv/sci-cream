import "@testing-library/jest-dom/vitest";

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

import { RecipeTable } from "@/app/_elements/tables/recipe";

import { RecipeID, getLightRecipe } from "@/__tests__/assets";
import { makeMockRecipe } from "@/__tests__/unit/util";

describe("RecipeTable", () => {
  afterEach(() => {
    cleanup();
  });

  // ---- Structure ----------------------------------------------------------------------------

  describe("Structure", () => {
    it("should render a <table> with the expected column headers", () => {
      const recipe = makeMockRecipe(RecipeID.Main);
      const { container } = render(<RecipeTable recipe={recipe} />);
      const headers = Array.from(container.querySelectorAll("thead tr:first-child th")).map(
        (th) => th.textContent,
      );
      expect(headers).toEqual(["Ingredient", "Qty (g)", "Qty (%)"]);
    });

    it("should render the totals row with the mix total in grams", () => {
      const recipe = makeMockRecipe(RecipeID.Main);
      const { container } = render(<RecipeTable recipe={recipe} />);
      const totalQtyCell = container.querySelector("thead tr:nth-child(2) td.comp-val")!;
      expect(totalQtyCell.textContent).toBe(recipe.mixTotal!.toFixed(0));
    });
  });

  // ---- Row Filtering ------------------------------------------------------------------------

  describe("Row Filtering", () => {
    it("should render one row per non-empty ingredient row", () => {
      const recipe = makeMockRecipe(RecipeID.Main);
      const { container } = render(<RecipeTable recipe={recipe} />);
      const bodyRows = container.querySelectorAll("tbody tr");
      expect(bodyRows).toHaveLength(getLightRecipe(RecipeID.Main).length);
    });
  });

  // ---- Cell Values --------------------------------------------------------------------------

  describe("Cell Values", () => {
    it("should display ingredient name and quantity for each row", () => {
      const recipe = makeMockRecipe(RecipeID.Main);
      const { container } = render(<RecipeTable recipe={recipe} />);
      const bodyRows = Array.from(container.querySelectorAll("tbody tr"));
      const light = getLightRecipe(RecipeID.Main);
      bodyRows.forEach((row, idx) => {
        const cells = row.querySelectorAll("td");
        expect(cells[0].textContent).toBe(light[idx][0]);
        expect(cells[1].textContent?.trim()).toBe(String(light[idx][1]));
      });
    });
  });
});
