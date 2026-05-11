import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

import {
  PropertiesView,
  DEFAULT_SELECTED_PROPERTIES,
} from "@/app/_elements/tables/properties-view";
import { filterActiveSlots } from "@/app/_components/recipe";
import { QtyToggle } from "@/app/_elements/selects/qty-toggle-select";
import { KeyFilter } from "@/app/_elements/selects/key-filter-select";

import {
  CompKey,
  FpdKey,
  compToPropKey,
  fpdToPropKey,
  getPropKeys,
  prop_key_as_med_str,
} from "@workspace/sci-cream";

import { makeMockRecipeContext } from "@/__tests__/unit/util";
import { RecipeID } from "@/__tests__/assets";

/** Mock implementation of ResizeObserver for testing purposes */
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

describe("PropertiesView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ---- Toolbar Rendering ------------------------------------------------------------------

  describe("Toolbar Rendering", () => {
    it("should render QtyToggleSelect", () => {
      const { container } = render(<PropertiesView recipes={[]} />);
      expect(container.querySelector("#qty-toggle-select")).toBeInTheDocument();
    });

    it("should render KeyFilterSelect", () => {
      const { container } = render(<PropertiesView recipes={[]} />);
      expect(container.querySelector("#key-filter-select")).toBeInTheDocument();
    });

    it("should render the underlying table", () => {
      const { container } = render(<PropertiesView recipes={[]} />);
      expect(container.querySelector("table")).toBeInTheDocument();
    });

    it("should render the toolbarPrefix inside the toolbar row", () => {
      const { container } = render(
        <PropertiesView recipes={[]} toolbarPrefix={<span data-testid="prefix" />} />,
      );
      expect(container.querySelector('[data-testid="prefix"]')).toBeInTheDocument();
    });
  });

  // ---- Property Rows ----------------------------------------------------------------------

  describe("Property Rows", () => {
    it("should show exactly DEFAULT_SELECTED_PROPERTIES keys in Auto mode", () => {
      const { container } = render(<PropertiesView recipes={[]} />);
      expect(container.querySelectorAll("tbody tr")).toHaveLength(DEFAULT_SELECTED_PROPERTIES.size);
    });

    it("should display property names using prop_key_as_med_str", () => {
      render(<PropertiesView recipes={[]} />);
      const milkFatKey = compToPropKey(CompKey.MilkFat);
      expect(screen.getByText(prop_key_as_med_str(milkFatKey))).toBeInTheDocument();
    });

    it("should display FPD property rows in Auto mode", () => {
      render(<PropertiesView recipes={[]} />);
      expect(screen.getByText(prop_key_as_med_str(fpdToPropKey(FpdKey.FPD)))).toBeInTheDocument();
      expect(
        screen.getByText(prop_key_as_med_str(fpdToPropKey(FpdKey.ServingTemp))),
      ).toBeInTheDocument();
    });

    it("should not show keys outside DEFAULT_SELECTED_PROPERTIES in Auto mode", () => {
      render(<PropertiesView recipes={[]} />);
      const extraKeys = getPropKeys().filter((k) => !DEFAULT_SELECTED_PROPERTIES.has(k));
      expect(extraKeys.length).toBeGreaterThan(0);
      for (const key of extraKeys) {
        expect(screen.queryByText(prop_key_as_med_str(key))).not.toBeInTheDocument();
      }
    });
  });

  // ---- QtyToggle Integration --------------------------------------------------------------

  describe("QtyToggle Integration", () => {
    it("should default to QtyToggle.Percentage", () => {
      const { container } = render(<PropertiesView recipes={[]} />);
      const select = container.querySelector("#qty-toggle-select select") as HTMLSelectElement;
      expect(select.value).toBe(QtyToggle.Percentage);
    });

    it("should support Quantity and Percentage options but not Composition", () => {
      const { container } = render(<PropertiesView recipes={[]} />);
      const select = container.querySelector("#qty-toggle-select select") as HTMLSelectElement;
      const options = Array.from(select.options).map((o) => o.value);
      expect(options).toContain(QtyToggle.Quantity);
      expect(options).toContain(QtyToggle.Percentage);
      expect(options).not.toContain(QtyToggle.Composition);
    });

    it("should update cell values when toggled from Percentage to Quantity", () => {
      const recipes = filterActiveSlots(makeMockRecipeContext([RecipeID.Main]).recipes);
      const { container } = render(<PropertiesView recipes={recipes} />);

      const getCellTexts = () =>
        Array.from(container.querySelectorAll("td.comp-val")).map((td) => td.textContent);

      const percentageValues = getCellTexts();

      const select = container.querySelector("#qty-toggle-select select") as HTMLSelectElement;
      fireEvent.change(select, { target: { value: QtyToggle.Quantity } });

      expect(getCellTexts()).not.toEqual(percentageValues);
    });
  });

  // ---- KeyFilter Integration --------------------------------------------------------------

  describe("KeyFilter Integration", () => {
    it("should default to KeyFilter.Auto", () => {
      const { container } = render(<PropertiesView recipes={[]} />);
      const select = container.querySelector("#key-filter-select select") as HTMLSelectElement;
      expect(select.value).toBe(KeyFilter.Auto);
    });

    it("should show all prop keys when filter is set to All", () => {
      const { container } = render(<PropertiesView recipes={[]} />);
      const select = container.querySelector("#key-filter-select select") as HTMLSelectElement;
      fireEvent.change(select, { target: { value: KeyFilter.All } });
      expect(container.querySelectorAll("tbody tr")).toHaveLength(getPropKeys().length);
    });

    it("should show no rows with NonZero filter when all recipes are empty", () => {
      const recipes = filterActiveSlots(makeMockRecipeContext([]).recipes);
      const { container } = render(<PropertiesView recipes={recipes} />);
      const select = container.querySelector("#key-filter-select select") as HTMLSelectElement;
      fireEvent.change(select, { target: { value: KeyFilter.NonZero } });
      expect(container.querySelectorAll("tbody tr")).toHaveLength(0);
    });

    it("should show NonZero rows for a non-empty recipe", () => {
      const recipes = filterActiveSlots(makeMockRecipeContext([RecipeID.Main]).recipes);
      const { container } = render(<PropertiesView recipes={recipes} />);
      const select = container.querySelector("#key-filter-select select") as HTMLSelectElement;
      fireEvent.change(select, { target: { value: KeyFilter.NonZero } });
      expect(container.querySelectorAll("tbody tr").length).toBeGreaterThan(0);
    });
  });

  // ---- Property Values --------------------------------------------------------------------

  describe("Property Values", () => {
    it("should display no meaningful numeric values in value cells for empty recipes", () => {
      const recipes = filterActiveSlots(makeMockRecipeContext([]).recipes);
      const { container } = render(<PropertiesView recipes={recipes} />);
      const valueCells = container.querySelectorAll("td.comp-val");
      // Cells show "" (undefined quantity) or "-" (invalid non-quantity values such as FPD keys)
      valueCells.forEach((cell) => {
        expect(cell.textContent?.trim()).toMatch(/^(-?)$/);
      });
    });
  });
});
