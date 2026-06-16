import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within, act } from "@testing-library/react";

import { PropertiesPanel } from "@/app/_components/properties-panel";
import { PropertiesView } from "@/app/_elements/tables/properties";

import { makeMockRecipeContext } from "@/__tests__/unit/util";
import { RecipeID } from "@/__tests__/assets";
import { setQtyToggle } from "@/__tests__/unit/util";
import { QtyToggle, QTY_TOGGLE_SHORT_LABELS } from "@/app/_elements/selects/qty-toggle-select";
import { STORAGE_KEYS } from "@/lib/local-storage";

describe("PropertiesPanel", () => {
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

  // ---- Select persistence -----------------------------------------------------------------

  describe("Select persistence", () => {
    const QTY_KEY = `${STORAGE_KEYS.propertiesPanelView}:qty`;

    it("writes the QtyToggle leaf key when the select changes", async () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<PropertiesPanel recipes={recipeCtx.recipes} />);
      await act(async () => {});

      await setQtyToggle(container, QtyToggle.Quantity);
      await act(async () => {});

      expect(localStorage.getItem(QTY_KEY)).toBe(JSON.stringify(QtyToggle.Quantity));
    });

    it("restores the QtyToggle value on remount", async () => {
      localStorage.setItem(QTY_KEY, JSON.stringify(QtyToggle.Quantity));
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(<PropertiesPanel recipes={recipeCtx.recipes} />);
      await act(async () => {});

      // Storage value must still be the restored value (not overwritten with default)
      expect(localStorage.getItem(QTY_KEY)).toBe(JSON.stringify(QtyToggle.Quantity));

      const select = container.querySelector("#qty-toggle-select select") as HTMLSelectElement;
      expect(select.options[select.selectedIndex].textContent).toBe(
        QTY_TOGGLE_SHORT_LABELS[QtyToggle.Quantity],
      );
    });

    it("two PropertiesView instances with different persistKey have no cross-talk", async () => {
      const recipeCtx = makeMockRecipeContext([]);
      const recipes = recipeCtx.recipes;

      const { container: c1 } = render(<PropertiesView recipes={recipes} persistKey="view-a" />);
      await act(async () => {});
      await setQtyToggle(c1, QtyToggle.Quantity);
      await act(async () => {});

      // view-a's key must be written
      expect(localStorage.getItem("view-a:qty")).toBe(JSON.stringify(QtyToggle.Quantity));

      // render a second view with a different key — it must not inherit view-a's stored value
      render(<PropertiesView recipes={recipes} persistKey="view-b" />);
      await act(async () => {});

      // view-b must not have written to its own key (no interaction)
      expect(localStorage.getItem("view-b:qty")).toBeNull();
      // view-a's storage is unaffected by view-b's mount
      expect(localStorage.getItem("view-a:qty")).toBe(JSON.stringify(QtyToggle.Quantity));
    });
  });
});
