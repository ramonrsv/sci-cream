import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within, act } from "@testing-library/react";

import {
  getSelectedOptionLabel,
  getSelectOptionLabels,
  selectOption,
} from "@/__tests__/unit/select";

import {
  PropertiesTable,
  PropertiesView,
  DEFAULT_SELECTED_PROPERTIES,
} from "@/app/_elements/tables/properties";
import { RecipeSummary, filterActiveSlots } from "@/lib/recipe";
import { QtyToggle, QTY_TOGGLE_SHORT_LABELS } from "@/app/_elements/selects/qty-toggle-select";
import {
  DeltaToggle,
  DELTA_TOGGLE_SHORT_LABELS,
} from "@/app/_elements/selects/delta-toggle-select";
import { KeyFilter } from "@/app/_elements/selects/key-filter-select";
import { applyQtyToggleAndFormat, computeDeltaAndFormat } from "@/lib/comp-value-format";

import {
  CompKey,
  FpdKey,
  PropKey,
  compToPropKey,
  fpdToPropKey,
  getPropKeys,
  getMixProperty,
  isPropKeyQuantity,
  prop_key_as_med_str,
} from "@workspace/sci-cream";

import { STORAGE_KEYS } from "@/lib/local-storage";

import { makeMockRecipeContext, setQtyToggle, setDeltaToggle } from "@/__tests__/unit/util";
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

// ---------------------------------------------------------------------------
// PropertiesTable (bare)
// ---------------------------------------------------------------------------

describe("PropertiesTable", () => {
  afterEach(() => {
    cleanup();
  });

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

  describe("Delta Mode", () => {
    const DELTA_PROP_KEY = compToPropKey(CompKey.TotalFats);

    /** Returns the value cells of the row for `propKey`, as trimmed strings. */
    const getRowCells = (propKey: PropKey) => {
      const row = screen.getByText(prop_key_as_med_str(propKey)).closest("tr")!;
      return Array.from(row.querySelectorAll("td.comp-val")).map((td) => td.textContent?.trim());
    };

    /** Computed absolute display value for a recipe's `DELTA_PROP_KEY` cell. */
    const expectedValue = (recipe: RecipeSummary) =>
      applyQtyToggleAndFormat(
        getMixProperty(recipe.mixProperties, DELTA_PROP_KEY),
        recipe.mixTotal!,
        recipe.mixTotal!,
        QtyToggle.Percentage,
        isPropKeyQuantity(DELTA_PROP_KEY),
      ).trim();

    /** Computed `main − reference` delta for `DELTA_PROP_KEY`, absolute or relative. */
    const expectedDelta = (main: RecipeSummary, ref: RecipeSummary, relative: boolean) =>
      computeDeltaAndFormat(
        getMixProperty(main.mixProperties, DELTA_PROP_KEY),
        main.mixTotal!,
        getMixProperty(ref.mixProperties, DELTA_PROP_KEY),
        ref.mixTotal!,
        QtyToggle.Percentage,
        isPropKeyQuantity(DELTA_PROP_KEY),
        relative,
      ).trim();

    it("shows only value columns when deltaToggle is Off", () => {
      const recipes = filterActiveSlots(
        makeMockRecipeContext([RecipeID.Main, RecipeID.RefA]).recipes,
      );
      render(
        <PropertiesTable
          recipes={recipes}
          propKeys={SAMPLE_PROP_KEYS}
          qtyToggle={QtyToggle.Percentage}
          deltaToggle={DeltaToggle.Off}
        />,
      );

      const cells = getRowCells(DELTA_PROP_KEY);
      expect(cells).toHaveLength(2);
      expect(cells[0]).toBe(expectedValue(recipes[0]));
      expect(cells[1]).toBe(expectedValue(recipes[1]));
    });

    it("keeps reference value columns and adds an adjacent absolute delta column", () => {
      const recipes = filterActiveSlots(
        makeMockRecipeContext([RecipeID.Main, RecipeID.RefA]).recipes,
      );
      render(
        <PropertiesTable
          recipes={recipes}
          propKeys={SAMPLE_PROP_KEYS}
          qtyToggle={QtyToggle.Percentage}
          deltaToggle={DeltaToggle.Absolute}
        />,
      );

      const cells = getRowCells(DELTA_PROP_KEY);
      // main value | ref value | ref delta
      expect(cells).toHaveLength(3);
      expect(cells[0]).toBe(expectedValue(recipes[0]));
      expect(cells[1]).toBe(expectedValue(recipes[1]));
      expect(cells[2]).toBe(expectedDelta(recipes[0], recipes[1], false));
    });

    it("renders relative deltas with a percent suffix in the delta column", () => {
      const recipes = filterActiveSlots(
        makeMockRecipeContext([RecipeID.Main, RecipeID.RefA]).recipes,
      );
      render(
        <PropertiesTable
          recipes={recipes}
          propKeys={SAMPLE_PROP_KEYS}
          qtyToggle={QtyToggle.Percentage}
          deltaToggle={DeltaToggle.Relative}
        />,
      );

      expect(getRowCells(DELTA_PROP_KEY)[2]).toBe(expectedDelta(recipes[0], recipes[1], true));
    });

    it("adds a ∆ header beside each reference value header when delta mode is active", () => {
      const recipes = filterActiveSlots(
        makeMockRecipeContext([RecipeID.Main, RecipeID.RefA]).recipes,
      );
      const { container } = render(
        <PropertiesTable
          recipes={recipes}
          propKeys={SAMPLE_PROP_KEYS}
          qtyToggle={QtyToggle.Percentage}
          deltaToggle={DeltaToggle.Absolute}
        />,
      );

      const thead = container.querySelector("thead")!;
      // Property | Recipe | Ref A | ∆
      expect(thead.querySelectorAll("th")).toHaveLength(4);
      expect(within(thead).getByText("Recipe")).toBeInTheDocument();
      expect(within(thead).getByText("Ref A")).toBeInTheDocument();
      expect(within(thead).getByText("∆")).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// PropertiesView (toolbar + bare)
// ---------------------------------------------------------------------------

describe("PropertiesView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

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

  describe("QtyToggle Integration", () => {
    it("should default to QtyToggle.Percentage", () => {
      const { container } = render(<PropertiesView recipes={[]} />);
      expect(getSelectedOptionLabel(container, "#qty-toggle-select")).toBe(
        QTY_TOGGLE_SHORT_LABELS[QtyToggle.Percentage],
      );
    });

    it("should support Quantity and Percentage options but not Composition", async () => {
      const { container } = render(<PropertiesView recipes={[]} />);
      const labels = await getSelectOptionLabels(container, "#qty-toggle-select");
      expect(labels).toContain(QTY_TOGGLE_SHORT_LABELS[QtyToggle.Quantity]);
      expect(labels).toContain(QTY_TOGGLE_SHORT_LABELS[QtyToggle.Percentage]);
      expect(labels).not.toContain(QTY_TOGGLE_SHORT_LABELS[QtyToggle.Composition]);
    });

    it("should update cell values when toggled from Percentage to Quantity", async () => {
      const recipes = filterActiveSlots(makeMockRecipeContext([RecipeID.Main]).recipes);
      const { container } = render(<PropertiesView recipes={recipes} />);

      const getCellTexts = () =>
        Array.from(container.querySelectorAll("td.comp-val")).map((td) => td.textContent);

      const percentageValues = getCellTexts();

      await selectOption(
        container,
        "#qty-toggle-select",
        QTY_TOGGLE_SHORT_LABELS[QtyToggle.Quantity],
      );

      expect(getCellTexts()).not.toEqual(percentageValues);
    });
  });

  describe("DeltaToggle Integration", () => {
    it("should not render the delta select with a single recipe", () => {
      const recipes = filterActiveSlots(makeMockRecipeContext([RecipeID.Main]).recipes);
      const { container } = render(<PropertiesView recipes={recipes} />);
      expect(container.querySelector("#delta-toggle-select")).not.toBeInTheDocument();
    });

    it("should render the delta select when a reference recipe is present", () => {
      const recipes = filterActiveSlots(
        makeMockRecipeContext([RecipeID.Main, RecipeID.RefA]).recipes,
      );
      const { container } = render(<PropertiesView recipes={recipes} />);
      expect(container.querySelector("#delta-toggle-select")).toBeInTheDocument();
    });

    it("should default to DeltaToggle.Off", () => {
      const recipes = filterActiveSlots(
        makeMockRecipeContext([RecipeID.Main, RecipeID.RefA]).recipes,
      );
      const { container } = render(<PropertiesView recipes={recipes} />);
      expect(getSelectedOptionLabel(container, "#delta-toggle-select")).toBe(
        DELTA_TOGGLE_SHORT_LABELS[DeltaToggle.Off],
      );
    });

    it("should add a delta column when switched to Absolute", async () => {
      const recipes = filterActiveSlots(
        makeMockRecipeContext([RecipeID.Main, RecipeID.RefA]).recipes,
      );
      const { container } = render(<PropertiesView recipes={recipes} />);

      const firstRowCellCount = () =>
        container.querySelector("tbody tr")!.querySelectorAll("td.comp-val").length;

      // Off: main value + ref value only.
      expect(firstRowCellCount()).toBe(2);

      await setDeltaToggle(container, DeltaToggle.Absolute);

      // Absolute: main value + ref value + ref delta.
      expect(firstRowCellCount()).toBe(3);
    });
  });

  describe("KeyFilter Integration", () => {
    it("should default to KeyFilter.Auto", () => {
      const { container } = render(<PropertiesView recipes={[]} />);
      expect(getSelectedOptionLabel(container, "#key-filter-select")).toBe(KeyFilter.Auto);
    });

    it("should show all prop keys when filter is set to All", async () => {
      const { container } = render(<PropertiesView recipes={[]} />);
      await selectOption(container, "#key-filter-select", KeyFilter.All);
      expect(container.querySelectorAll("tbody tr")).toHaveLength(getPropKeys().length);
    });

    it("should show no rows with Active filter when all recipes are empty", async () => {
      const recipes = filterActiveSlots(makeMockRecipeContext([]).recipes);
      const { container } = render(<PropertiesView recipes={recipes} />);
      await selectOption(container, "#key-filter-select", KeyFilter.Active);
      expect(container.querySelectorAll("tbody tr")).toHaveLength(0);
    });

    it("should show Active rows for a non-empty recipe", async () => {
      const recipes = filterActiveSlots(makeMockRecipeContext([RecipeID.Main]).recipes);
      const { container } = render(<PropertiesView recipes={recipes} />);
      await selectOption(container, "#key-filter-select", KeyFilter.Active);
      expect(container.querySelectorAll("tbody tr").length).toBeGreaterThan(0);
    });
  });

  describe("Property Values", () => {
    it("should display no meaningful numeric values in value cells for empty recipes", () => {
      const recipes = filterActiveSlots(makeMockRecipeContext([]).recipes);
      const { container } = render(<PropertiesView recipes={recipes} />);
      const valueCells = container.querySelectorAll("td.comp-val");
      valueCells.forEach((cell) => {
        expect(cell.textContent?.trim()).toMatch(/^(-?)$/);
      });
    });
  });

  // ---- Select persistence -----------------------------------------------------------------

  describe("Select persistence", () => {
    const QTY_KEY = `${STORAGE_KEYS.propertiesPanelView}:qty`;
    const DELTA_KEY = `${STORAGE_KEYS.propertiesPanelView}:delta`;

    beforeEach(() => {
      localStorage.clear();
    });

    it("writes the DeltaToggle leaf key when the select changes", async () => {
      const recipes = filterActiveSlots(
        makeMockRecipeContext([RecipeID.Main, RecipeID.RefA]).recipes,
      );
      const { container } = render(
        <PropertiesView recipes={recipes} persistKey={STORAGE_KEYS.propertiesPanelView} />,
      );
      await act(async () => {});

      await setDeltaToggle(container, DeltaToggle.Relative);
      await act(async () => {});

      expect(localStorage.getItem(DELTA_KEY)).toBe(JSON.stringify(DeltaToggle.Relative));
    });

    it("writes the QtyToggle leaf key when the select changes", async () => {
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(
        <PropertiesView
          recipes={recipeCtx.recipes}
          persistKey={STORAGE_KEYS.propertiesPanelView}
        />,
      );
      await act(async () => {});

      await setQtyToggle(container, QtyToggle.Quantity);
      await act(async () => {});

      expect(localStorage.getItem(QTY_KEY)).toBe(JSON.stringify(QtyToggle.Quantity));
    });

    it("restores the QtyToggle value on remount", async () => {
      localStorage.setItem(QTY_KEY, JSON.stringify(QtyToggle.Quantity));
      const recipeCtx = makeMockRecipeContext([]);
      const { container } = render(
        <PropertiesView
          recipes={recipeCtx.recipes}
          persistKey={STORAGE_KEYS.propertiesPanelView}
        />,
      );
      await act(async () => {});

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

      expect(localStorage.getItem("view-a:qty")).toBe(JSON.stringify(QtyToggle.Quantity));

      render(<PropertiesView recipes={recipes} persistKey="view-b" />);
      await act(async () => {});

      expect(localStorage.getItem("view-b:qty")).toBeNull();
      expect(localStorage.getItem("view-a:qty")).toBe(JSON.stringify(QtyToggle.Quantity));
    });
  });
});
