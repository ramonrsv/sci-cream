import "@testing-library/jest-dom/vitest";

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

import { PropertiesTable } from "@/app/_elements/tables/properties-table";
import { RecipeSummary, filterActiveSlots } from "@/app/_components/recipe";
import { QtyToggle } from "@/app/_elements/selects/qty-toggle-select";
import { applyQtyToggleAndFormat } from "@/lib/comp-value-format";
import { isPropKeyQuantity } from "@/lib/sci-cream/sci-cream";

import {
  CompKey,
  FpdKey,
  PropKey,
  compToPropKey,
  fpdToPropKey,
  getMixProperty,
  prop_key_as_med_str,
} from "@workspace/sci-cream";

import { makeMockRecipeContext } from "@/__tests__/unit/util";
import { RecipeID } from "@/__tests__/assets";

const SAMPLE_PROP_KEYS: PropKey[] = [
  compToPropKey(CompKey.MilkFat),
  compToPropKey(CompKey.TotalFats),
  compToPropKey(CompKey.MSNF),
  compToPropKey(CompKey.TotalSugars),
  compToPropKey(CompKey.TotalSolids),
  compToPropKey(CompKey.Water),
  fpdToPropKey(FpdKey.FPD),
  fpdToPropKey(FpdKey.ServingTemp),
];

describe("PropertiesTable", () => {
  afterEach(() => {
    cleanup();
  });

  // ---- Structure --------------------------------------------------------------------------

  describe("Structure", () => {
    it("should render a <table> element", () => {
      const { container } = render(
        <PropertiesTable
          recipes={[]}
          propKeys={SAMPLE_PROP_KEYS}
          qtyToggle={QtyToggle.Percentage}
        />,
      );
      expect(container.querySelector("table")).toBeInTheDocument();
    });

    it('should show "Property" as the first column header', () => {
      render(
        <PropertiesTable
          recipes={[]}
          propKeys={SAMPLE_PROP_KEYS}
          qtyToggle={QtyToggle.Percentage}
        />,
      );
      expect(screen.getByText("Property")).toBeInTheDocument();
    });
  });

  // ---- Column Headers ---------------------------------------------------------------------

  describe("Column Headers", () => {
    it("should show one column header per provided recipe", () => {
      const recipes: RecipeSummary[] = filterActiveSlots(
        makeMockRecipeContext([RecipeID.RefA, RecipeID.RefB]).recipes,
      );
      const { container } = render(
        <PropertiesTable
          recipes={recipes}
          propKeys={SAMPLE_PROP_KEYS}
          qtyToggle={QtyToggle.Percentage}
        />,
      );
      // "Property" + one per recipe
      expect(container.querySelectorAll("thead th")).toHaveLength(1 + recipes.length);
    });

    it("should use recipe.id as the column header text", () => {
      const recipes: RecipeSummary[] = filterActiveSlots(
        makeMockRecipeContext([RecipeID.RefA, RecipeID.RefB]).recipes,
      );
      const { container } = render(
        <PropertiesTable
          recipes={recipes}
          propKeys={SAMPLE_PROP_KEYS}
          qtyToggle={QtyToggle.Percentage}
        />,
      );
      const thead = container.querySelector("thead")!;
      expect(within(thead).getByText("Recipe")).toBeInTheDocument();
      expect(within(thead).getByText("Ref A")).toBeInTheDocument();
      expect(within(thead).getByText("Ref B")).toBeInTheDocument();
    });
  });

  // ---- Property Rows ----------------------------------------------------------------------

  describe("Property Rows", () => {
    it("should render exactly one row per provided propKey", () => {
      const { container } = render(
        <PropertiesTable
          recipes={[]}
          propKeys={SAMPLE_PROP_KEYS}
          qtyToggle={QtyToggle.Percentage}
        />,
      );
      expect(container.querySelectorAll("tbody tr")).toHaveLength(SAMPLE_PROP_KEYS.length);
    });

    it("should display the prop_key_as_med_str label for each propKey", () => {
      render(
        <PropertiesTable
          recipes={[]}
          propKeys={SAMPLE_PROP_KEYS}
          qtyToggle={QtyToggle.Percentage}
        />,
      );
      for (const propKey of SAMPLE_PROP_KEYS) {
        expect(screen.getByText(prop_key_as_med_str(propKey))).toBeInTheDocument();
      }
    });
  });

  // ---- Cell Values ------------------------------------------------------------------------

  describe("Cell Values", () => {
    it("should display non-empty formatted values for a non-empty recipe", () => {
      const recipes = filterActiveSlots(makeMockRecipeContext([RecipeID.Main]).recipes);
      const { container } = render(
        <PropertiesTable
          recipes={recipes}
          propKeys={SAMPLE_PROP_KEYS}
          qtyToggle={QtyToggle.Percentage}
        />,
      );
      const valueCells = container.querySelectorAll("td.comp-val");
      const nonEmpty = Array.from(valueCells).filter(
        (cell) => cell.textContent!.trim() !== "" && cell.textContent!.trim() !== "-",
      );
      expect(nonEmpty.length).toBeGreaterThan(0);
    });

    it("should format values with the provided qtyToggle (Percentage)", () => {
      const recipes = filterActiveSlots(makeMockRecipeContext([RecipeID.Main]).recipes);
      render(
        <PropertiesTable
          recipes={recipes}
          propKeys={SAMPLE_PROP_KEYS}
          qtyToggle={QtyToggle.Percentage}
        />,
      );

      const propKey = compToPropKey(CompKey.TotalFats);
      const expected = applyQtyToggleAndFormat(
        getMixProperty(recipes[0].mixProperties, propKey),
        recipes[0].mixTotal!,
        recipes[0].mixTotal!,
        QtyToggle.Percentage,
        isPropKeyQuantity(propKey),
      ).trim();

      const row = screen.getByText(prop_key_as_med_str(propKey)).closest("tr")!;
      expect(row.querySelector("td.comp-val")!.textContent?.trim()).toBe(expected);
    });

    it("should format values with the provided qtyToggle (Quantity)", () => {
      const recipes = filterActiveSlots(makeMockRecipeContext([RecipeID.Main]).recipes);
      render(
        <PropertiesTable
          recipes={recipes}
          propKeys={SAMPLE_PROP_KEYS}
          qtyToggle={QtyToggle.Quantity}
        />,
      );

      const propKey = compToPropKey(CompKey.TotalFats);
      const expected = applyQtyToggleAndFormat(
        getMixProperty(recipes[0].mixProperties, propKey),
        recipes[0].mixTotal!,
        recipes[0].mixTotal!,
        QtyToggle.Quantity,
        isPropKeyQuantity(propKey),
      ).trim();

      const row = screen.getByText(prop_key_as_med_str(propKey)).closest("tr")!;
      expect(row.querySelector("td.comp-val")!.textContent?.trim()).toBe(expected);
    });
  });
});
