import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach } from "vitest";

import { MAX_RECIPES, RECIPE_TOTAL_ROWS } from "@/lib/styles/sizes";
import {
  makeRecipeId,
  makeEmptyRecipeContext,
  isRecipeEmpty,
  recipeHasIngredients,
  calculateMixTotal,
  effectiveMixTotal,
  makeSciCreamRecipe,
  makeLightRecipe,
  makeBalanceLocks,
  makeBalancedRecipeUpdates,
  makeUpdatedRecipe,
  makeUpdatedRecipeContext,
  makeEmptyRecipe,
  makeRecipeBaseline,
  isRecipeDirty,
  isRecipeRenamed,
  clearRecipeIdentity,
  withRecipeIdentity,
  stringifyRecipeToStore,
  makeUpdatedRecipeFromStore,
  type Recipe,
} from "./recipe";

import type { WasmResources } from "@/lib/resources/wasm-resources";

import {
  Category,
  CompKey,
  Ingredient,
  Composition,
  MixProperties,
  RecipeLine,
  Bridge as WasmBridge,
  new_ingredient_database_seeded_from_embedded_data,
  type LightRecipe,
} from "@workspace/sci-cream";

vi.mock("@workspace/sci-cream", async () => {
  const actual = await vi.importActual("@workspace/sci-cream");
  return {
    ...actual,
    into_ingredient_from_spec: vi.fn((spec) => {
      const ingredient = { name: spec.name || "Test Ingredient", composition: new Composition() };
      return ingredient;
    }),
  };
});

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

describe("Recipe Helper Functions", () => {
  // ---- makeRecipeId ----------------------------------------------------------------------------

  describe("makeRecipeId", () => {
    it("should return 'Recipe' for index 0 and 'Ref N' for others", () => {
      expect(makeRecipeId(0)).toBe("Recipe");
      expect(makeRecipeId(1)).toBe("Ref A");
      expect(makeRecipeId(2)).toBe("Ref B");
      expect(makeRecipeId(3)).toBe("Ref C");
    });
  });

  // ---- makeEmptyRecipeContext -------------------------------------------------------------------

  describe("makeEmptyRecipeContext", () => {
    it("should create a context with correct number of recipes", () => {
      const context = makeEmptyRecipeContext();
      expect(context.recipes).toHaveLength(MAX_RECIPES);
    });

    it("should create recipes with correct number of ingredient rows", () => {
      const context = makeEmptyRecipeContext();
      context.recipes.forEach((recipe) => {
        expect(recipe.ingredientRows).toHaveLength(RECIPE_TOTAL_ROWS);
      });
    });

    it("should assign id 'Recipe' to first slot and 'Ref N' to others", () => {
      const context = makeEmptyRecipeContext();
      expect(context.recipes[0].id).toBe("Recipe");
      expect(context.recipes[1].id).toBe("Ref A");
      expect(context.recipes[2].id).toBe("Ref B");
    });

    it("should initialize ingredient rows with correct indices", () => {
      const context = makeEmptyRecipeContext();
      context.recipes[0].ingredientRows.forEach((row, idx) => {
        expect(row.index).toBe(idx);
        expect(row.name).toBe("");
        expect(row.quantity).toBeUndefined();
        expect(row.ingredient).toBeUndefined();
      });
    });

    it("should initialize mix properties for each recipe", () => {
      const context = makeEmptyRecipeContext();
      context.recipes.forEach((recipe) => {
        expect(recipe.mixProperties).toBeInstanceOf(MixProperties);
      });
    });
  });

  // ---- isRecipeEmpty ----------------------------------------------------------------------------

  describe("isRecipeEmpty", () => {
    let recipe: Recipe;

    beforeEach(() => {
      recipe = makeEmptyRecipeContext().recipes[0];
    });

    it("should return true when mixTotal is undefined", () => {
      recipe.mixTotal = undefined;
      expect(isRecipeEmpty(recipe)).toBe(true);
    });

    it("should return true when mixTotal is 0", () => {
      recipe.mixTotal = 0;
      expect(isRecipeEmpty(recipe)).toBe(true);
    });

    it("should return false when mixTotal is positive", () => {
      recipe.mixTotal = 100;
      expect(isRecipeEmpty(recipe)).toBe(false);
    });

    it("should return false when mixTotal is negative (edge case)", () => {
      recipe.mixTotal = -1;
      expect(isRecipeEmpty(recipe)).toBe(false);
    });
  });

  // ---- recipeHasIngredients ---------------------------------------------------------------------

  describe("recipeHasIngredients", () => {
    let recipe: Recipe;

    // Mark a row as resolved to a valid ingredient.
    const withIngredient = (index: number) => {
      recipe.ingredientRows[index].ingredient = new Ingredient(
        `Ingredient ${index}`,
        Category.Dairy,
        new Composition(),
      );
    };

    beforeEach(() => {
      recipe = makeEmptyRecipeContext().recipes[0];
    });

    it("should return false for an empty recipe", () => {
      expect(recipeHasIngredients(recipe)).toBe(false);
    });

    it("should return true for a valid ingredient with a zero quantity", () => {
      withIngredient(0);
      recipe.ingredientRows[0].quantity = 0;
      expect(recipeHasIngredients(recipe)).toBe(true);
    });

    it("should return true for a valid ingredient with no quantity", () => {
      withIngredient(0);
      recipe.ingredientRows[0].quantity = undefined;
      expect(recipeHasIngredients(recipe)).toBe(true);
    });

    it("should return false when only orphan quantities are present", () => {
      recipe.ingredientRows[0].quantity = 40;
      recipe.ingredientRows[0].ingredient = undefined;
      expect(recipeHasIngredients(recipe)).toBe(false);
    });
  });

  // ---- calculateMixTotal ------------------------------------------------------------------------

  describe("calculateMixTotal", () => {
    let recipe: Recipe;

    // Mark a row as resolved to a valid ingredient so its quantity counts toward the mix total.
    const withIngredient = (index: number) => {
      recipe.ingredientRows[index].ingredient = new Ingredient(
        `Ingredient ${index}`,
        Category.Dairy,
        new Composition(),
      );
    };

    beforeEach(() => {
      recipe = makeEmptyRecipeContext().recipes[0];
    });

    it("should return undefined when all quantities are undefined", () => {
      expect(calculateMixTotal(recipe)).toBeUndefined();
    });

    it("should sum all defined quantities of valid-ingredient rows", () => {
      [0, 1, 2].forEach(withIngredient);
      recipe.ingredientRows[0].quantity = 50;
      recipe.ingredientRows[1].quantity = 30;
      recipe.ingredientRows[2].quantity = 20;
      expect(calculateMixTotal(recipe)).toBe(100);
    });

    it("should skip undefined quantities when at least one valid row is defined", () => {
      [0, 1, 2].forEach(withIngredient);
      recipe.ingredientRows[0].quantity = 50;
      recipe.ingredientRows[1].quantity = undefined;
      recipe.ingredientRows[2].quantity = 30;
      expect(calculateMixTotal(recipe)).toBe(80);
    });

    it("should handle decimal quantities", () => {
      [0, 1].forEach(withIngredient);
      recipe.ingredientRows[0].quantity = 33.33;
      recipe.ingredientRows[1].quantity = 66.67;
      expect(calculateMixTotal(recipe)).toBeCloseTo(100, 2);
    });

    it("should handle zero quantities", () => {
      [0, 1].forEach(withIngredient);
      recipe.ingredientRows[0].quantity = 0;
      recipe.ingredientRows[1].quantity = 100;
      expect(calculateMixTotal(recipe)).toBe(100);
    });

    it("should exclude orphan quantities (rows without a valid ingredient)", () => {
      withIngredient(0);
      recipe.ingredientRows[0].quantity = 60;
      recipe.ingredientRows[1].quantity = 40;
      recipe.ingredientRows[1].ingredient = undefined;
      expect(calculateMixTotal(recipe)).toBe(60);
    });

    it("should return undefined when only orphan quantities are present", () => {
      recipe.ingredientRows[0].quantity = 40;
      recipe.ingredientRows[0].ingredient = undefined;
      expect(calculateMixTotal(recipe)).toBeUndefined();
    });
  });

  // ---- makeSciCreamRecipe -----------------------------------------------------------------------

  describe("makeSciCreamRecipe", () => {
    let recipe: Recipe;

    beforeEach(() => {
      recipe = makeEmptyRecipeContext().recipes[0];
    });

    it("should create SciCreamRecipe with correct name", () => {
      recipe.name = "Test Recipe";
      const sciCreamRecipe = makeSciCreamRecipe(recipe);
      expect(sciCreamRecipe.name).toBe("Test Recipe");
    });

    it("should return empty recipe lines when no ingredients have both ingredient and quantity", () => {
      expect(makeSciCreamRecipe(recipe).lines.length).toEqual(0);
    });

    it("should filter out rows without ingredient", () => {
      recipe.ingredientRows[0].quantity = 50;
      recipe.ingredientRows[0].ingredient = undefined;
      expect(makeSciCreamRecipe(recipe).lines.length).toEqual(0);
    });

    it("should filter out rows without quantity", () => {
      recipe.ingredientRows[0].ingredient = {
        name: "Test",
        composition: new Composition(),
      } as Ingredient;
      recipe.ingredientRows[0].quantity = undefined;
      expect(makeSciCreamRecipe(recipe).lines.length).toEqual(0);
    });

    it("should create RecipeLines for valid rows", () => {
      const comp1 = new Composition();
      const comp2 = new Composition();
      recipe.ingredientRows[0].ingredient = new Ingredient("Milk", Category.Dairy, comp1);
      recipe.ingredientRows[1].ingredient = new Ingredient("Sugar", Category.Sweetener, comp2);
      recipe.ingredientRows[0].quantity = 50;
      recipe.ingredientRows[1].quantity = 30;

      const lines = makeSciCreamRecipe(recipe).lines;
      expect(lines).toHaveLength(2);
      expect(lines[0]).toBeInstanceOf(RecipeLine);
      expect(lines[1]).toBeInstanceOf(RecipeLine);
      expect(lines[0].amount).toBe(50);
      expect(lines[1].amount).toBe(30);
    });
  });

  // ---- makeLightRecipe --------------------------------------------------------------------------

  describe("makeLightRecipe", () => {
    let recipe: Recipe;
    const wasmBridge = new WasmBridge(new_ingredient_database_seeded_from_embedded_data());
    const hasIngredient = (name: string) => wasmBridge.has_ingredient(name);

    beforeEach(() => {
      recipe = makeEmptyRecipeContext().recipes[0];
    });

    it("should return empty recipe lines when no ingredients have both ingredient and quantity", () => {
      expect(makeLightRecipe(recipe, hasIngredient).length).toEqual(0);
    });

    it("should filter out rows without ingredient name", () => {
      recipe.ingredientRows[0].quantity = 50;
      expect(makeLightRecipe(recipe, hasIngredient).length).toEqual(0);
    });

    it("should include rows with undefined quantity as 0 (so the balancer can fill them)", () => {
      recipe.ingredientRows[0].name = "Whole Milk";
      recipe.ingredientRows[0].quantity = undefined;
      const lines = makeLightRecipe(recipe, hasIngredient);
      expect(lines).toEqual([["Whole Milk", 0]]);
    });

    it("should filter out rows with invalid ingredient names", () => {
      recipe.ingredientRows[0].name = "Invalid Ingredient";
      recipe.ingredientRows[0].quantity = 50;
      expect(makeLightRecipe(recipe, hasIngredient).length).toEqual(0);
    });

    it("should create [name, quantity] for valid rows", () => {
      recipe.ingredientRows[0].name = "Whole Milk";
      recipe.ingredientRows[1].name = "Sucrose";
      recipe.ingredientRows[0].quantity = 50;
      recipe.ingredientRows[1].quantity = 30;

      const lines = makeLightRecipe(recipe, hasIngredient);
      expect(lines).toHaveLength(2);
      expect(lines[0]).toEqual(["Whole Milk", 50]);
      expect(lines[1]).toEqual(["Sucrose", 30]);
    });
  });

  // ---- makeBalanceLocks -------------------------------------------------------------------------

  describe("makeBalanceLocks", () => {
    let recipe: Recipe;
    const wasmBridge = new WasmBridge(new_ingredient_database_seeded_from_embedded_data());
    const hasIngredient = (name: string) => wasmBridge.has_ingredient(name);

    beforeEach(() => {
      recipe = makeEmptyRecipeContext().recipes[0];
      recipe.ingredientRows[0].name = "Whole Milk";
      recipe.ingredientRows[0].quantity = 50;
      recipe.ingredientRows[1].name = "Sucrose";
      recipe.ingredientRows[1].quantity = 30;
    });

    it("returns an empty list when no rows are locked", () => {
      expect(makeBalanceLocks(recipe, hasIngredient)).toEqual([]);
    });

    it("emits [lightIndex, { Amount }] holding a locked row at its current grams", () => {
      recipe.ingredientRows[1].locked = true;
      expect(makeBalanceLocks(recipe, hasIngredient)).toEqual([[1, { Amount: 30 }]]);
    });

    it("indexes by light-recipe position, skipping non-eligible rows before a locked one", () => {
      // Row 1 has an unknown ingredient → not eligible, so it isn't a light-recipe line. The
      // locked row 2 becomes light-recipe line 1, not 2.
      recipe.ingredientRows[1] = { index: 1, name: "Definitely Not An Ingredient", quantity: 10 };
      recipe.ingredientRows[2].name = "Egg Yolk";
      recipe.ingredientRows[2].quantity = 20;
      recipe.ingredientRows[2].locked = true;
      expect(makeBalanceLocks(recipe, hasIngredient)).toEqual([[1, { Amount: 20 }]]);
    });

    it("omits a locked row that is not light-recipe eligible", () => {
      recipe.ingredientRows[2] = {
        index: 2,
        name: "Definitely Not An Ingredient",
        quantity: 10,
        locked: true,
      };
      expect(makeBalanceLocks(recipe, hasIngredient)).toEqual([]);
    });

    it("skips a locked row with an unset (undefined) quantity (stays free)", () => {
      recipe.ingredientRows[0].quantity = undefined; // Whole Milk locked but no amount set
      recipe.ingredientRows[0].locked = true;
      recipe.ingredientRows[1].locked = true; // Sucrose, 30
      expect(makeBalanceLocks(recipe, hasIngredient)).toEqual([[1, { Amount: 30 }]]);
    });

    it("emits { Amount: 0 } for a locked zero-amount row, pinning it out of the balance", () => {
      recipe.ingredientRows[0].quantity = 0; // Whole Milk locked at 0 g
      recipe.ingredientRows[0].locked = true;
      expect(makeBalanceLocks(recipe, hasIngredient)).toEqual([[0, { Amount: 0 }]]);
    });

    it("emits an entry per locked row, preserving light-recipe order", () => {
      recipe.ingredientRows[0].locked = true;
      recipe.ingredientRows[1].locked = true;
      expect(makeBalanceLocks(recipe, hasIngredient)).toEqual([
        [0, { Amount: 50 }],
        [1, { Amount: 30 }],
      ]);
    });
  });

  // ---- makeBalancedRecipeUpdates ----------------------------------------------------------------

  describe("makeBalancedRecipeUpdates", () => {
    let recipe: Recipe;
    const wasmBridge = new WasmBridge(new_ingredient_database_seeded_from_embedded_data());
    const hasIngredient = (name: string) => wasmBridge.has_ingredient(name);

    beforeEach(() => {
      recipe = makeEmptyRecipeContext().recipes[0];
      // Populate two eligible rows + leave the rest empty
      recipe.ingredientRows[0].name = "Whole Milk";
      recipe.ingredientRows[0].quantity = 50;
      recipe.ingredientRows[1].name = "Sucrose";
      recipe.ingredientRows[1].quantity = 30;
    });

    it("throws when balanced length doesn't match eligible rows", () => {
      // 2 eligible rows but only 1 balanced entry
      expect(() => makeBalancedRecipeUpdates(recipe, [["Whole Milk", 60]], hasIngredient)).toThrow(
        /balanced length.*does not match eligible row count/,
      );
    });

    it("returns a `rows` array with one entry per eligible row (== balanced.length)", () => {
      const balanced: LightRecipe = [
        ["Whole Milk", 60],
        ["Sucrose", 20],
      ];
      const updates = makeBalancedRecipeUpdates(recipe, balanced, hasIngredient);
      expect(updates.rows).toBeDefined();
      expect(updates.rows!.length).toBe(balanced.length);
    });

    it("writes balanced quantities onto eligible rows by index", () => {
      const balanced: LightRecipe = [
        ["Whole Milk", 60],
        ["Sucrose", 20],
      ];
      const updates = makeBalancedRecipeUpdates(recipe, balanced, hasIngredient);
      expect(updates.rows![0].quantity).toBe(60);
      expect(updates.rows![1].quantity).toBe(20);
    });

    it("excludes non-eligible rows from the updates array (so they pass through unchanged)", () => {
      // Row 2 has an unknown ingredient name → not eligible.
      // Row 3+ are left in the default empty state, also non-eligible.
      // None should appear in updates.rows, so makeUpdatedRecipe leaves them untouched.
      recipe.ingredientRows[2].name = "Definitely Not An Ingredient";
      recipe.ingredientRows[2].quantity = 10;
      const balanced: LightRecipe = [
        ["Whole Milk", 60],
        ["Sucrose", 20],
      ];
      const updates = makeBalancedRecipeUpdates(recipe, balanced, hasIngredient);
      expect(updates.rows!.length).toBe(2);
      expect(updates.rows!.every((row) => row.index === 0 || row.index === 1)).toBe(true);
    });

    it("correctly maps balanced values across a gap of non-eligible rows", () => {
      // Eligible rows: 0 (Whole Milk), 1 (Sucrose), 3 (Egg Yolk).
      // Row 2 is non-eligible (unknown ingredient name) and must be skipped without throwing
      // off the mapping of `balanced[2]` to recipe row 3.
      recipe.ingredientRows[2].name = "Definitely Not An Ingredient";
      recipe.ingredientRows[2].quantity = 10;
      recipe.ingredientRows[3].name = "Egg Yolk";
      recipe.ingredientRows[3].quantity = 20;
      const balanced: LightRecipe = [
        ["Whole Milk", 60],
        ["Sucrose", 20],
        ["Egg Yolk", 15],
      ];
      const updates = makeBalancedRecipeUpdates(recipe, balanced, hasIngredient);
      expect(updates.rows!.map((r) => r.index)).toEqual([0, 1, 3]);
      expect(updates.rows![2].name).toBe("Egg Yolk");
      expect(updates.rows![2].quantity).toBe(15);
    });

    it("writes balanced quantities onto rows that started with undefined quantity", () => {
      // Add a third row with a known ingredient but no starting quantity — eligible now, so the
      // balanced array must have 3 entries and its third value should be written to that row.
      recipe.ingredientRows[2].name = "Egg Yolk";
      recipe.ingredientRows[2].quantity = undefined;
      const balanced: LightRecipe = [
        ["Whole Milk", 60],
        ["Sucrose", 20],
        ["Egg Yolk", 15],
      ];
      const updates = makeBalancedRecipeUpdates(recipe, balanced, hasIngredient);
      expect(updates.rows![2].quantity).toBe(15);
      expect(updates.rows![2].name).toBe("Egg Yolk");
    });

    it("preserves ingredient names on updated rows", () => {
      const balanced: LightRecipe = [
        ["Whole Milk", 60],
        ["Sucrose", 20],
      ];
      const updates = makeBalancedRecipeUpdates(recipe, balanced, hasIngredient);
      expect(updates.rows![0].name).toBe("Whole Milk");
      expect(updates.rows![1].name).toBe("Sucrose");
    });

    it("leaves a locked row's quantity untouched, ignoring its balanced value", () => {
      recipe.ingredientRows[1].locked = true; // Sucrose locked at 30
      const balanced: LightRecipe = [
        ["Whole Milk", 60],
        ["Sucrose", 30.4], // balancer returns it fixed; must not be re-rounded onto the row
      ];
      const updates = makeBalancedRecipeUpdates(recipe, balanced, hasIngredient);
      expect(updates.rows![0].quantity).toBe(60);
      expect(updates.rows![1].quantity).toBe(30);
    });

    it("snaps NNLS-derived floats to the input's sub-unit step (per standardInputStepByPercent)", () => {
      // standardInputStepByPercent(201.25, 1, 2) = "2"  → snap to nearest 2 → 202
      //   (a naive `.toFixed(0)` would give 200)
      // standardInputStepByPercent(4.37, 1, 2) = "0.05" → snap to nearest 0.05 → 4.35
      //   (a naive `.toFixed(1)` would give 4.4, and .toFixed(2) would give 4.37)
      const balanced: LightRecipe = [
        ["Whole Milk", 201.25],
        ["Sucrose", 4.37],
      ];
      const updates = makeBalancedRecipeUpdates(recipe, balanced, hasIngredient);
      expect(updates.rows![0].quantity).toBe(202);
      expect(updates.rows![1].quantity).toBe(4.35);
    });
  });

  // ---- makeUpdatedRecipeContext -----------------------------------------------------------------

  describe("makeUpdatedRecipeContext", () => {
    it("writes a single updated recipe into its `.index` slot", () => {
      const ctx = makeEmptyRecipeContext();
      const updated = makeEmptyRecipe(1);
      updated.name = "renamed-ref-a";

      const next = makeUpdatedRecipeContext(ctx, [updated]);

      expect(next.recipes[1]).toBe(updated);
      expect(next.recipes[1].name).toBe("renamed-ref-a");
      expect(next.recipes[0]).toBe(ctx.recipes[0]);
      expect(next.recipes[2]).toBe(ctx.recipes[2]);
    });

    it("writes multiple updated recipes into their respective slots in one pass", () => {
      const ctx = makeEmptyRecipeContext();
      const updated0 = makeEmptyRecipe(0);
      updated0.name = "a";
      const updated2 = makeEmptyRecipe(2);
      updated2.name = "b";

      const next = makeUpdatedRecipeContext(ctx, [updated0, updated2]);

      expect(next.recipes[0]).toBe(updated0);
      expect(next.recipes[2]).toBe(updated2);
      expect(next.recipes[1]).toBe(ctx.recipes[1]);
    });

    it("returns a new context object (does not mutate input)", () => {
      const ctx = makeEmptyRecipeContext();
      const updated = makeEmptyRecipe(0);
      const next = makeUpdatedRecipeContext(ctx, [updated]);
      expect(next).not.toBe(ctx);
      expect(next.recipes).not.toBe(ctx.recipes);
    });

    it("throws when a recipe's index is out of range (too high)", () => {
      const ctx = makeEmptyRecipeContext();
      const bad = makeEmptyRecipe(0);
      bad.index = ctx.recipes.length;
      expect(() => makeUpdatedRecipeContext(ctx, [bad])).toThrow(/out of range/);
    });

    it("throws when a recipe's index is negative", () => {
      const ctx = makeEmptyRecipeContext();
      const bad = makeEmptyRecipe(0);
      bad.index = -1;
      expect(() => makeUpdatedRecipeContext(ctx, [bad])).toThrow(/out of range/);
    });

    it("is a no-op when called with an empty updates array", () => {
      const ctx = makeEmptyRecipeContext();
      const next = makeUpdatedRecipeContext(ctx, []);
      expect(next.recipes).toEqual(ctx.recipes);
    });
  });

  // ---- SciCreamRecipe.calculate_composition -----------------------------------------------------

  describe("SciCreamRecipe.calculate_composition", () => {
    let recipe: Recipe;

    beforeEach(() => {
      vi.clearAllMocks();
      recipe = makeEmptyRecipeContext().recipes[0];
    });

    it("should return a Composition object", () => {
      const result = makeSciCreamRecipe(recipe).calculate_composition();
      expect(result).toBeInstanceOf(Composition);
    });
  });

  // ---- SciCreamRecipe.calculate_mix_properties --------------------------------------------------

  describe("SciCreamRecipe.calculate_mix_properties", () => {
    let recipe: Recipe;

    beforeEach(() => {
      vi.clearAllMocks();
      recipe = makeEmptyRecipeContext().recipes[0];
    });

    it("should return a MixProperties object", () => {
      const result = makeSciCreamRecipe(recipe).calculate_mix_properties();
      expect(result).toBeInstanceOf(MixProperties);
    });
  });

  // ---- makeUpdatedRecipeFromStore ---------------------------------------------------------------

  describe("makeUpdatedRecipeFromStore", () => {
    let recipe: Recipe;
    let resources: WasmResources;

    beforeEach(() => {
      const bridge = new WasmBridge(new_ingredient_database_seeded_from_embedded_data());
      resources = {
        updateIdx: 0,
        wasmBridge: bridge,
        hasIngredient: (n) => bridge.has_ingredient(n),
      };
      recipe = makeEmptyRecipeContext().recipes[0];
    });

    it("should not throw when pasting into a slot that already has a valid ingredient", () => {
      recipe = makeUpdatedRecipeFromStore(
        recipe,
        { name: "", serializedRows: "Fructose\t100" },
        resources,
      );
      expect(recipe.ingredientRows[0].name).toBe("Fructose");

      expect(() => {
        recipe = makeUpdatedRecipeFromStore(
          recipe,
          { name: "", serializedRows: "Whole Milk\t100" },
          resources,
        );
      }).not.toThrow();

      expect(recipe.ingredientRows[0].name).toBe("Whole Milk");
    });

    it("propagates the store's savedRef onto the resulting recipe", () => {
      const result = makeUpdatedRecipeFromStore(
        recipe,
        {
          name: "Loaded",
          serializedRows: "Whole Milk\t100",
          savedRef: { recipeId: 7, versionNumber: 3 },
        },
        resources,
      );
      expect(result.savedRef).toEqual({ recipeId: 7, versionNumber: 3 });
    });

    it("captures a fresh baseline when loading a saved-recipe store (savedRef set)", () => {
      const result = makeUpdatedRecipeFromStore(
        recipe,
        {
          name: "Loaded",
          serializedRows: "Whole Milk\t100",
          savedRef: { recipeId: 7, versionNumber: 1 },
        },
        resources,
      );
      expect(result.baseline).toBeDefined();
      expect(isRecipeDirty(result)).toBe(false);
    });

    it("leaves baseline undefined for an anonymous store (no savedRef)", () => {
      const result = makeUpdatedRecipeFromStore(
        recipe,
        { name: "Anon", serializedRows: "Whole Milk\t100" },
        resources,
      );
      expect(result.savedRef).toBeUndefined();
      expect(result.baseline).toBeUndefined();
      expect(isRecipeDirty(result)).toBe(false);
    });

    it("restores the locked flag onto the rows named in the store's lockedRows", () => {
      const result = makeUpdatedRecipeFromStore(
        recipe,
        { name: "Locked", serializedRows: "Whole Milk\t100\nSucrose\t20", lockedRows: [1] },
        resources,
      );
      expect(result.ingredientRows[0].locked).toBe(false);
      expect(result.ingredientRows[1].locked).toBe(true);
    });

    it("clears locks when the store carries no lockedRows (e.g. a fresh paste)", () => {
      recipe.ingredientRows[0].locked = true;
      const result = makeUpdatedRecipeFromStore(
        recipe,
        { name: "", serializedRows: "Whole Milk\t100" },
        resources,
      );
      expect(result.ingredientRows[0].locked).toBe(false);
    });
  });

  // ---- Baseline + dirty + identity helpers --------------------------------------------------------

  describe("makeRecipeBaseline", () => {
    it("captures the current name and serialized rows", () => {
      const recipe = makeEmptyRecipeContext().recipes[0];
      recipe.name = "My Recipe";
      recipe.ingredientRows[0].name = "Whole Milk";
      recipe.ingredientRows[0].quantity = 100;

      const baseline = makeRecipeBaseline(recipe);
      expect(baseline.name).toBe("My Recipe");
      expect(baseline.serializedRows).toContain("Whole Milk\t100");
    });
  });

  describe("isRecipeDirty", () => {
    let recipe: Recipe;

    beforeEach(() => {
      recipe = makeEmptyRecipeContext().recipes[0];
      recipe.name = "Loaded Recipe";
      recipe.ingredientRows[0].name = "Whole Milk";
      recipe.ingredientRows[0].quantity = 500;
    });

    it("returns false when baseline is undefined (anonymous recipe)", () => {
      expect(recipe.baseline).toBeUndefined();
      expect(isRecipeDirty(recipe)).toBe(false);
    });

    it("returns false when current state matches baseline", () => {
      recipe.baseline = makeRecipeBaseline(recipe);
      expect(isRecipeDirty(recipe)).toBe(false);
    });

    it("returns true when the name differs from baseline", () => {
      recipe.baseline = makeRecipeBaseline(recipe);
      recipe.name = "Loaded Recipe (edited)";
      expect(isRecipeDirty(recipe)).toBe(true);
    });

    it("returns true when an ingredient row differs from baseline", () => {
      recipe.baseline = makeRecipeBaseline(recipe);
      recipe.ingredientRows[0].quantity = 600;
      expect(isRecipeDirty(recipe)).toBe(true);
    });

    it("returns true when a row is added beyond baseline", () => {
      recipe.baseline = makeRecipeBaseline(recipe);
      recipe.ingredientRows[1].name = "Sucrose";
      recipe.ingredientRows[1].quantity = 100;
      expect(isRecipeDirty(recipe)).toBe(true);
    });
  });

  describe("isRecipeRenamed", () => {
    let recipe: Recipe;

    beforeEach(() => {
      recipe = makeEmptyRecipeContext().recipes[0];
      recipe.name = "Original";
    });

    it("returns false when baseline is undefined", () => {
      expect(isRecipeRenamed(recipe)).toBe(false);
    });

    it("returns false when the name matches baseline", () => {
      recipe.baseline = makeRecipeBaseline(recipe);
      expect(isRecipeRenamed(recipe)).toBe(false);
    });

    it("returns true when the name differs from baseline", () => {
      recipe.baseline = makeRecipeBaseline(recipe);
      recipe.name = "Renamed";
      expect(isRecipeRenamed(recipe)).toBe(true);
    });

    it("returns true even when only the name changed (rows still match baseline)", () => {
      recipe.ingredientRows[0].name = "Whole Milk";
      recipe.ingredientRows[0].quantity = 100;
      recipe.baseline = makeRecipeBaseline(recipe);
      recipe.name = "Renamed";
      expect(isRecipeRenamed(recipe)).toBe(true);
    });
  });

  describe("clearRecipeIdentity", () => {
    it("strips savedRef and baseline; preserves other fields", () => {
      const recipe = makeEmptyRecipeContext().recipes[0];
      recipe.name = "Loaded";
      recipe.ingredientRows[0].name = "Whole Milk";
      recipe.ingredientRows[0].quantity = 100;
      recipe.savedRef = { recipeId: 7, versionNumber: 2 };
      recipe.baseline = makeRecipeBaseline(recipe);

      const cleared = clearRecipeIdentity(recipe);
      expect(cleared.savedRef).toBeUndefined();
      expect(cleared.baseline).toBeUndefined();
      expect(cleared.name).toBe("Loaded");
      expect(cleared.ingredientRows[0].name).toBe("Whole Milk");
    });

    it("returns a new object (does not mutate the input)", () => {
      const recipe = makeEmptyRecipeContext().recipes[0];
      recipe.savedRef = { recipeId: 7, versionNumber: 1 };
      clearRecipeIdentity(recipe);
      expect(recipe.savedRef).toEqual({ recipeId: 7, versionNumber: 1 });
    });
  });

  describe("withRecipeIdentity", () => {
    it("sets savedRef and captures a fresh baseline reflecting current state", () => {
      const recipe = makeEmptyRecipeContext().recipes[0];
      recipe.name = "Newly Saved";
      recipe.ingredientRows[0].name = "Whole Milk";
      recipe.ingredientRows[0].quantity = 100;

      const next = withRecipeIdentity(recipe, { recipeId: 42, versionNumber: 1 });
      expect(next.savedRef).toEqual({ recipeId: 42, versionNumber: 1 });
      expect(next.baseline?.name).toBe("Newly Saved");
      expect(next.baseline?.serializedRows).toContain("Whole Milk\t100");
    });

    it("leaves the resulting recipe clean (not dirty)", () => {
      const recipe = makeEmptyRecipeContext().recipes[0];
      recipe.name = "Newly Saved";
      recipe.ingredientRows[0].name = "Whole Milk";
      recipe.ingredientRows[0].quantity = 100;

      const next = withRecipeIdentity(recipe, { recipeId: 42, versionNumber: 1 });
      expect(isRecipeDirty(next)).toBe(false);
    });

    it("returns a new object (does not mutate the input)", () => {
      const recipe = makeEmptyRecipeContext().recipes[0];
      withRecipeIdentity(recipe, { recipeId: 7, versionNumber: 1 });
      expect(recipe.savedRef).toBeUndefined();
      expect(recipe.baseline).toBeUndefined();
    });
  });

  describe("stringifyRecipeToStore", () => {
    it("includes the savedRef when set", () => {
      const recipe = makeEmptyRecipeContext().recipes[0];
      recipe.name = "Loaded";
      recipe.ingredientRows[0].name = "Whole Milk";
      recipe.ingredientRows[0].quantity = 100;
      recipe.savedRef = { recipeId: 7, versionNumber: 2 };

      const store = stringifyRecipeToStore(recipe);
      expect(store.name).toBe("Loaded");
      expect(store.savedRef).toEqual({ recipeId: 7, versionNumber: 2 });
      expect(store.serializedRows).toContain("Whole Milk\t100");
    });

    it("omits the savedRef key entirely for anonymous recipes", () => {
      const recipe = makeEmptyRecipeContext().recipes[0];
      recipe.name = "Anon";
      recipe.ingredientRows[0].name = "Whole Milk";
      recipe.ingredientRows[0].quantity = 100;

      const store = stringifyRecipeToStore(recipe);
      expect("savedRef" in store).toBe(false);
    });

    it("records locked row indices in lockedRows, and keeps them out of serializedRows", () => {
      const recipe = makeEmptyRecipeContext().recipes[0];
      recipe.ingredientRows[0].name = "Whole Milk";
      recipe.ingredientRows[0].quantity = 100;
      recipe.ingredientRows[2].name = "Sucrose";
      recipe.ingredientRows[2].quantity = 20;
      recipe.ingredientRows[2].locked = true;

      const store = stringifyRecipeToStore(recipe);
      expect(store.lockedRows).toEqual([2]);
      expect(store.serializedRows).not.toMatch(/lock/i);
    });

    it("omits the lockedRows key entirely when no rows are locked", () => {
      const recipe = makeEmptyRecipeContext().recipes[0];
      recipe.ingredientRows[0].name = "Whole Milk";
      recipe.ingredientRows[0].quantity = 100;

      const store = stringifyRecipeToStore(recipe);
      expect("lockedRows" in store).toBe(false);
    });

    it("records evaporation as a sidecar, keeping it out of serializedRows", () => {
      const recipe = makeEmptyRecipeContext().recipes[0];
      recipe.ingredientRows[0].name = "Whole Milk";
      recipe.ingredientRows[0].quantity = 1000;
      recipe.evaporation = 150;

      const store = stringifyRecipeToStore(recipe);
      expect(store.evaporation).toBe(150);
      expect(store.serializedRows).not.toMatch(/150/);
    });

    it("omits the evaporation key when there is none (undefined or zero)", () => {
      const recipe = makeEmptyRecipeContext().recipes[0];
      recipe.ingredientRows[0].name = "Whole Milk";
      recipe.ingredientRows[0].quantity = 1000;

      expect("evaporation" in stringifyRecipeToStore(recipe)).toBe(false);
      recipe.evaporation = 0;
      expect("evaporation" in stringifyRecipeToStore(recipe)).toBe(false);
    });
  });

  // ---- effectiveMixTotal -------------------------------------------------------------------------

  describe("effectiveMixTotal", () => {
    let recipe: Recipe;

    beforeEach(() => {
      recipe = makeEmptyRecipeContext().recipes[0];
      recipe.mixTotal = 1000;
    });

    it("returns undefined for an empty recipe (no mixTotal)", () => {
      recipe.mixTotal = undefined;
      expect(effectiveMixTotal(recipe)).toBeUndefined();
    });

    it("returns mixTotal unchanged when there is no evaporation", () => {
      expect(effectiveMixTotal(recipe)).toBe(1000);
    });

    it("subtracts evaporated water from the ingredient sum (the final mix yield)", () => {
      recipe.evaporation = 150;
      expect(effectiveMixTotal(recipe)).toBe(850);
    });
  });

  // ---- makeUpdatedRecipe (evaporation) ----------------------------------------------------------

  describe("makeUpdatedRecipe evaporation handling", () => {
    let recipe: Recipe;
    let resources: WasmResources;

    beforeEach(() => {
      const bridge = new WasmBridge(new_ingredient_database_seeded_from_embedded_data());
      resources = {
        updateIdx: 0,
        wasmBridge: bridge,
        hasIngredient: (n) => bridge.has_ingredient(n),
      };
      recipe = makeUpdatedRecipeFromStore(
        makeEmptyRecipeContext().recipes[0],
        { name: "", serializedRows: "Whole Milk\t1000" },
        resources,
      );
    });

    it("applies a new evaporation value and recomputes the post-evaporation composition", () => {
      const waterBefore = recipe.mixProperties.composition.get(CompKey.Water);

      const updated = makeUpdatedRecipe(recipe, { evaporation: 150 }, resources);

      expect(updated.evaporation).toBe(150);
      // Removing water concentrates the mix, so per-100g water drops.
      expect(updated.mixProperties.composition.get(CompKey.Water)).toBeLessThan(waterBefore);
    });

    it("leaves evaporation and mix properties untouched when the key is absent", () => {
      const withEvap = makeUpdatedRecipe(recipe, { evaporation: 150 }, resources);
      const renamed = makeUpdatedRecipe(withEvap, { name: "Renamed" }, resources);

      expect(renamed.evaporation).toBe(150);
      // No evaporation or row change, so the mix-properties object is reused, not recomputed.
      expect(renamed.mixProperties).toBe(withEvap.mixProperties);
    });

    it("clears evaporation when set to 0 and recomputes", () => {
      // Read the baseline before updating: makeUpdatedRecipe frees the input's old mix properties.
      const baselineWater = recipe.mixProperties.composition.get(CompKey.Water);

      const withEvap = makeUpdatedRecipe(recipe, { evaporation: 150 }, resources);
      expect(withEvap.mixProperties.composition.get(CompKey.Water)).toBeLessThan(baselineWater);

      const cleared = makeUpdatedRecipe(withEvap, { evaporation: 0 }, resources);
      expect(cleared.evaporation).toBe(0);
      expect(cleared.mixProperties.composition.get(CompKey.Water)).toBeCloseTo(baselineWater, 6);
    });

    it("records `mixError` and empties mix properties when evaporation exceeds available water", () => {
      // 1000 g of Whole Milk holds ~880 g of water; removing 950 g is impossible.
      const updated = makeUpdatedRecipe(recipe, { evaporation: 950 }, resources);

      expect(updated.evaporation).toBe(950);
      expect(updated.mixError).toMatch(/invalid evaporation/i);
      // Reset to a fresh, empty MixProperties — not the concentrated milk composition.
      const empty = new MixProperties();
      expect(updated.mixProperties).toBeInstanceOf(MixProperties);
      expect(updated.mixProperties.composition.get(CompKey.Water)).toBe(
        empty.composition.get(CompKey.Water),
      );
      expect(updated.mixProperties.composition.get(CompKey.TotalSolids)).toBe(
        empty.composition.get(CompKey.TotalSolids),
      );
    });

    it("clears `mixError` once evaporation returns to a valid amount", () => {
      const errored = makeUpdatedRecipe(recipe, { evaporation: 950 }, resources);
      expect(errored.mixError).toBeDefined();

      const recovered = makeUpdatedRecipe(errored, { evaporation: 100 }, resources);
      expect(recovered.mixError).toBeUndefined();
      expect(recovered.mixProperties.composition.get(CompKey.Water)).toBeLessThan(100);
    });
  });

  // ---- makeUpdatedRecipeFromStore (evaporation round-trip) ---------------------------------------

  describe("makeUpdatedRecipeFromStore evaporation", () => {
    let resources: WasmResources;

    beforeEach(() => {
      const bridge = new WasmBridge(new_ingredient_database_seeded_from_embedded_data());
      resources = {
        updateIdx: 0,
        wasmBridge: bridge,
        hasIngredient: (n) => bridge.has_ingredient(n),
      };
    });

    it("restores the stored evaporation onto the recipe", () => {
      const result = makeUpdatedRecipeFromStore(
        makeEmptyRecipeContext().recipes[0],
        { name: "Evap", serializedRows: "Whole Milk\t1000", evaporation: 150 },
        resources,
      );
      expect(result.evaporation).toBe(150);
    });

    it("clears evaporation when the store has none (e.g. a fresh paste)", () => {
      const withEvap = makeUpdatedRecipeFromStore(
        makeEmptyRecipeContext().recipes[0],
        { name: "Evap", serializedRows: "Whole Milk\t1000", evaporation: 150 },
        resources,
      );
      const pasted = makeUpdatedRecipeFromStore(
        withEvap,
        { name: "", serializedRows: "Whole Milk\t1000" },
        resources,
      );
      expect(pasted.evaporation).toBe(0);
    });
  });
});
