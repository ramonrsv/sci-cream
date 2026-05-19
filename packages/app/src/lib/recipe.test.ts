import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach } from "vitest";

import { MAX_RECIPES, RECIPE_TOTAL_ROWS } from "@/lib/styles/sizes";
import {
  makeRecipeId,
  makeEmptyRecipeContext,
  isRecipeEmpty,
  calculateMixTotal,
  makeSciCreamRecipe,
  makeLightRecipe,
  makeRecipeBaseline,
  isRecipeDirty,
  isRecipeRenamed,
  clearRecipeIdentity,
  withRecipeIdentity,
  stringifyRecipeToStore,
  makeUpdatedRecipeFromStore,
  type Recipe,
} from "./recipe";

import type { WasmResources } from "./wasm-resources";

import {
  Category,
  Ingredient,
  Composition,
  MixProperties,
  RecipeLine,
  Bridge as WasmBridge,
  new_ingredient_database_seeded_from_embedded_data,
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

  // ---- calculateMixTotal ------------------------------------------------------------------------

  describe("calculateMixTotal", () => {
    let recipe: Recipe;

    beforeEach(() => {
      recipe = makeEmptyRecipeContext().recipes[0];
    });

    it("should return undefined when all quantities are undefined", () => {
      expect(calculateMixTotal(recipe)).toBeUndefined();
    });

    it("should sum all defined quantities", () => {
      recipe.ingredientRows[0].quantity = 50;
      recipe.ingredientRows[1].quantity = 30;
      recipe.ingredientRows[2].quantity = 20;
      expect(calculateMixTotal(recipe)).toBe(100);
    });

    it("should treat undefined quantities as 0 when at least one is defined", () => {
      recipe.ingredientRows[0].quantity = 50;
      recipe.ingredientRows[1].quantity = undefined;
      recipe.ingredientRows[2].quantity = 30;
      expect(calculateMixTotal(recipe)).toBe(80);
    });

    it("should handle decimal quantities", () => {
      recipe.ingredientRows[0].quantity = 33.33;
      recipe.ingredientRows[1].quantity = 66.67;
      expect(calculateMixTotal(recipe)).toBeCloseTo(100, 2);
    });

    it("should handle zero quantities", () => {
      recipe.ingredientRows[0].quantity = 0;
      recipe.ingredientRows[1].quantity = 100;
      expect(calculateMixTotal(recipe)).toBe(100);
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

    it("should filter out rows without quantity", () => {
      recipe.ingredientRows[0].name = "Whole Milk";
      recipe.ingredientRows[0].quantity = undefined;
      expect(makeLightRecipe(recipe, hasIngredient).length).toEqual(0);
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
  });
});
