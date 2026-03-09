import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";

import { MixPropertiesGrid, DEFAULT_SELECTED_PROPERTIES } from "@/app/properties";
import { QtyToggle } from "@/lib/ui/qty-toggle-select";
import { KeyFilter } from "@/lib/ui/key-filter-select";
import { applyQtyToggleAndFormat } from "@/lib/ui/comp-value-format";
import { isPropKeyQuantity } from "@/lib/sci-cream/sci-cream";

import {
  CompKey,
  FpdKey,
  compToPropKey,
  fpdToPropKey,
  getMixProperty,
  getPropKeys,
  prop_key_as_med_str,
} from "@workspace/sci-cream";

import { makeMockRecipeContext } from "@/__tests__/unit/util";
import { RecipeID } from "@/__tests__/assets";

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
// MixPropertiesGrid component
// ---------------------------------------------------------------------------

describe("MixPropertiesGrid", () => {
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
      const { container } = render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);
      expect(container.querySelector("#mix-properties-grid")).toBeInTheDocument();
    });

    it("should render with the grid-component class", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);
      expect(container.querySelector(".grid-component")).toBeInTheDocument();
    });

    it("should render QtyToggleSelect", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);
      expect(container.querySelector("#qty-toggle-select")).toBeInTheDocument();
    });

    it("should render KeyFilterSelect", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);
      expect(container.querySelector("#key-filter-select")).toBeInTheDocument();
    });

    it("should render a table", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);
      expect(container.querySelector("table")).toBeInTheDocument();
    });
  });

  // ---- Table Headers -----------------------------------------------------------------------

  describe("Table Headers", () => {
    it('should show "Property" as the first column header', () => {
      const recipeCtx = makeMockRecipeContext([]);
      render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);
      expect(screen.getByText("Property")).toBeInTheDocument();
    });

    it("should show the main recipe name as a column header", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);
      const thead = container.querySelector("thead")!;
      expect(within(thead).getByText("Recipe")).toBeInTheDocument();
    });

    it("should show non-empty reference recipe names as column headers", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.RefA, RecipeID.RefB]);
      render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);
      expect(screen.getByText("Ref A")).toBeInTheDocument();
      expect(screen.getByText("Ref B")).toBeInTheDocument();
    });

    it("should not show empty reference recipe names as column headers", () => {
      const recipeCtx = makeMockRecipeContext([]);
      render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);
      expect(screen.queryByText("Ref A")).not.toBeInTheDocument();
      expect(screen.queryByText("Ref B")).not.toBeInTheDocument();
    });
  });

  // ---- Recipe Filtering --------------------------------------------------------------------

  describe("Recipe Filtering", () => {
    it("should show only the main recipe column when all recipes are empty", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);
      // "Property" + "Recipe" = 2 header cells
      expect(container.querySelectorAll("thead th")).toHaveLength(2);
      expect(screen.getByText("Recipe")).toBeInTheDocument();
    });

    it("should always show the main recipe even when it is empty", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);
      const thead = container.querySelector("thead")!;
      expect(within(thead).getByText("Recipe")).toBeInTheDocument();
    });

    it("should show main recipe and non-empty reference recipe columns", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.RefB]);
      const { container } = render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);
      // "Property" + "Recipe" + "Ref B" = 3 header cells
      expect(container.querySelectorAll("thead th")).toHaveLength(3);
      expect(screen.getByText("Recipe")).toBeInTheDocument();
      expect(screen.getByText("Ref B")).toBeInTheDocument();
    });

    it("should show all non-empty reference recipes", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.RefA, RecipeID.RefB]);
      const { container } = render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);
      // "Property" + "Recipe" + "Ref A" + "Ref B" = 4 header cells
      expect(container.querySelectorAll("thead th")).toHaveLength(4);
      expect(screen.getByText("Recipe")).toBeInTheDocument();
      expect(screen.getByText("Ref A")).toBeInTheDocument();
      expect(screen.getByText("Ref B")).toBeInTheDocument();
    });

    it("should not show empty reference recipe columns", () => {
      const recipeCtx = makeMockRecipeContext([]);
      render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);
      expect(screen.queryByText("Ref A")).not.toBeInTheDocument();
      expect(screen.queryByText("Ref B")).not.toBeInTheDocument();
    });
  });

  // ---- Property Rows -----------------------------------------------------------------------

  describe("Property Rows", () => {
    it("should show exactly DEFAULT_SELECTED_PROPERTIES keys in Auto mode", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);
      expect(container.querySelectorAll("tbody tr")).toHaveLength(DEFAULT_SELECTED_PROPERTIES.size);
    });

    it("should display property names using prop_key_as_med_str", () => {
      const recipeCtx = makeMockRecipeContext([]);
      render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);
      const milkFatKey = compToPropKey(CompKey.MilkFat);
      expect(screen.getByText(prop_key_as_med_str(milkFatKey))).toBeInTheDocument();
    });

    it("should display FPD property rows in Auto mode", () => {
      const recipeCtx = makeMockRecipeContext([]);
      render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);
      expect(screen.getByText(prop_key_as_med_str(fpdToPropKey(FpdKey.FPD)))).toBeInTheDocument();
      expect(
        screen.getByText(prop_key_as_med_str(fpdToPropKey(FpdKey.ServingTemp))),
      ).toBeInTheDocument();
    });

    it("should not show keys outside DEFAULT_SELECTED_PROPERTIES in Auto mode", () => {
      const recipeCtx = makeMockRecipeContext([]);
      render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);
      const extraKeys = getPropKeys().filter((k) => !DEFAULT_SELECTED_PROPERTIES.has(k));
      expect(extraKeys.length).toBeGreaterThan(0);
      for (const key of extraKeys) {
        expect(screen.queryByText(prop_key_as_med_str(key))).not.toBeInTheDocument();
      }
    });
  });

  // ---- QtyToggle Integration ---------------------------------------------------------------

  describe("QtyToggle Integration", () => {
    it("should default to QtyToggle.Percentage", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);
      const select = container.querySelector("#qty-toggle-select select") as HTMLSelectElement;
      expect(select.value).toBe(QtyToggle.Percentage);
    });

    it("should support Quantity and Percentage options but not Composition", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);
      const select = container.querySelector("#qty-toggle-select select") as HTMLSelectElement;
      const options = Array.from(select.options).map((o) => o.value);
      expect(options).toContain(QtyToggle.Quantity);
      expect(options).toContain(QtyToggle.Percentage);
      expect(options).not.toContain(QtyToggle.Composition);
    });

    it("should update cell values when toggled from Percentage to Quantity", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);

      const getCellTexts = () =>
        Array.from(container.querySelectorAll("td.comp-val")).map((td) => td.textContent);

      const percentageValues = getCellTexts();

      const select = container.querySelector("#qty-toggle-select select") as HTMLSelectElement;
      fireEvent.change(select, { target: { value: QtyToggle.Quantity } });

      expect(getCellTexts()).not.toEqual(percentageValues);
    });
  });

  // ---- KeyFilter Integration ---------------------------------------------------------------

  describe("KeyFilter Integration", () => {
    it("should default to KeyFilter.Auto", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);
      const select = container.querySelector("#key-filter-select select") as HTMLSelectElement;
      expect(select.value).toBe(KeyFilter.Auto);
    });

    it("should show all prop keys when filter is set to All", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);
      const select = container.querySelector("#key-filter-select select") as HTMLSelectElement;
      fireEvent.change(select, { target: { value: KeyFilter.All } });
      expect(container.querySelectorAll("tbody tr")).toHaveLength(getPropKeys().length);
    });

    it("should show no rows with NonZero filter when all recipes are empty", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);
      const select = container.querySelector("#key-filter-select select") as HTMLSelectElement;
      fireEvent.change(select, { target: { value: KeyFilter.NonZero } });
      expect(container.querySelectorAll("tbody tr")).toHaveLength(0);
    });

    it("should show NonZero rows for a non-empty recipe", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);
      const select = container.querySelector("#key-filter-select select") as HTMLSelectElement;
      fireEvent.change(select, { target: { value: KeyFilter.NonZero } });
      expect(container.querySelectorAll("tbody tr").length).toBeGreaterThan(0);
    });
  });

  // ---- Property Values ---------------------------------------------------------------------

  describe("Property Values", () => {
    it("should display no meaningful numeric values in value cells for empty recipes", () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);
      const valueCells = container.querySelectorAll("td.comp-val");
      // Cells show "" (undefined quantity) or "-" (invalid non-quantity values such as FPD keys)
      valueCells.forEach((cell) => {
        expect(cell.textContent?.trim()).toMatch(/^(-?)$/);
      });
    });

    it("should display non-empty formatted values for a non-empty recipe", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);
      const valueCells = container.querySelectorAll("td.comp-val");
      const nonEmptyCells = Array.from(valueCells).filter(
        (cell) => cell.textContent!.trim() !== "" && cell.textContent!.trim() !== "-",
      );
      expect(nonEmptyCells.length).toBeGreaterThan(0);
    });

    it("should display the correct Percentage-mode value for TotalFats", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);

      const mixProperties = recipeCtx.recipes[0].mixProperties!;
      const mixTotal = recipeCtx.recipes[0].mixTotal!;
      const propKey = compToPropKey(CompKey.TotalFats);
      const expectedText = applyQtyToggleAndFormat(
        getMixProperty(mixProperties, propKey),
        mixTotal,
        mixTotal,
        QtyToggle.Percentage,
        isPropKeyQuantity(propKey),
      ).trim();

      const propNameCell = screen.getByText(prop_key_as_med_str(propKey));
      const row = propNameCell.closest("tr")!;
      const valueCell = row.querySelector("td.comp-val")!;
      expect(valueCell.textContent?.trim()).toBe(expectedText);
    });

    it("should display the correct Quantity-mode value for TotalFats", () => {
      const recipeCtx = makeMockRecipeContext([RecipeID.Main]);
      const { container } = render(<MixPropertiesGrid recipes={recipeCtx.recipes} />);

      const select = container.querySelector("#qty-toggle-select select") as HTMLSelectElement;
      fireEvent.change(select, { target: { value: QtyToggle.Quantity } });

      const mixProperties = recipeCtx.recipes[0].mixProperties!;
      const mixTotal = recipeCtx.recipes[0].mixTotal!;
      const propKey = compToPropKey(CompKey.TotalFats);
      const expectedText = applyQtyToggleAndFormat(
        getMixProperty(mixProperties, propKey),
        mixTotal,
        mixTotal,
        QtyToggle.Quantity,
        isPropKeyQuantity(propKey),
      ).trim();

      const propNameCell = screen.getByText(prop_key_as_med_str(propKey));
      const row = propNameCell.closest("tr")!;
      const valueCell = row.querySelector("td.comp-val")!;
      expect(valueCell.textContent?.trim()).toBe(expectedText);
    });
  });
});
