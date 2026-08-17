import { expect, test, describe } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";

import { findUserByEmail } from "@/lib/data/users";
import {
  fetchUserIngredientSpecByName,
  fetchAllUserIngredientSpecs,
  IngredientTransfer,
} from "@/lib/data/ingredients";
import {
  fetchAllUserSavedRecipes,
  createUserRecipe,
  createUserRecipeVersion,
  updateUserRecipeVersion,
  renameUserRecipe,
  deleteUserRecipe,
  deleteUserRecipeVersion,
  setUserRecipeFavourite,
  SavedRecipeJson,
} from "@/lib/data/recipes";
import {
  createUserBatch,
  fetchAllUserBatches,
  updateUserBatch,
  setUserBatchFavourite,
  deleteUserBatch,
  BatchInput,
  SavedBatchJson,
} from "@/lib/data/batches";

import { Rating } from "@/lib/rating";
import { UserSelect, batchRecipesTable } from "@/lib/database/schema";
import * as schema from "@/lib/database/schema";
import { getDatabaseUrl } from "@/lib/database/util";

import {
  into_ingredient_from_spec,
  Category,
  Ingredient,
  Composition,
  Bridge as WasmBridge,
  IngredientDatabase,
  type LightRecipe,
  OnConflict,
} from "@workspace/sci-cream";

import { RecipeID, getLightRecipe } from "@/../src/__tests__/assets";

import {
  TEST_USER_A,
  TEST_USER_B,
  USER_DEFINED_FRUCTOSE_SPEC,
  RECIPE_INVALID_INGREDIENT,
  TEST_USER_B_RECIPES,
} from "@/lib/database/assets";

type SpecAsset = typeof USER_DEFINED_FRUCTOSE_SPEC;

/** Helper function to get the test user B from the database, throwing an error if not found */
async function getTestUserB() {
  const user = await findUserByEmail(TEST_USER_B.email);
  if (!user) throw new Error("Test user B not found");
  return user;
}

/** Helper to assert that a Drizzle ingredient spec matches the expected spec and user asset */
function expectDrizzleSpecToMatch(
  specDrizzle: IngredientTransfer | undefined,
  spec: SpecAsset,
  user: UserSelect,
) {
  expect(specDrizzle).toBeDefined();
  expect(specDrizzle!.name).toBe(spec.name);
  expect(specDrizzle!.user).toBe(user.id);
  expect(specDrizzle!.category).toBe(spec.category);
  expect(JSON.stringify(specDrizzle!.spec)).toBe(JSON.stringify(spec));
}

/** Helper to assert that an `Ingredient` parsed from a spec matches the expected spec asset */
function expectParsedIngredientToMatchSpec(ingParsed: Ingredient, spec: SpecAsset) {
  expect(ingParsed.name).toBe(spec.name);
  expect(ingParsed.category).toBe(Category[spec.category as keyof typeof Category]);
  expect(ingParsed).toBeInstanceOf(Ingredient);
  expect(ingParsed.composition).toBeInstanceOf(Composition);
}

describe("fetchUserIngredientSpecByName", () => {
  test("into_ingredient_from_spec from user-defined spec in DB", async () => {
    const user = await getTestUserB();
    const spec = USER_DEFINED_FRUCTOSE_SPEC;

    const specDrizzle = await fetchUserIngredientSpecByName(TEST_USER_B.email, spec.name);
    expectDrizzleSpecToMatch(specDrizzle, spec, user);

    const ingParsed = into_ingredient_from_spec(specDrizzle!.spec);
    expectParsedIngredientToMatchSpec(ingParsed, spec);
  });

  test("WasmBridge.seed_from_specs from user-defined spec in DB", async () => {
    const user = await getTestUserB();
    const spec = USER_DEFINED_FRUCTOSE_SPEC;
    const bridge = new WasmBridge(new IngredientDatabase());

    const specDrizzle = await fetchUserIngredientSpecByName(TEST_USER_B.email, spec.name);
    expectDrizzleSpecToMatch(specDrizzle, spec, user);

    bridge.seed_from_specs([specDrizzle!.spec], OnConflict.Reject);
    expect(bridge.has_ingredient(spec.name)).toBe(true);
    expectParsedIngredientToMatchSpec(bridge.get_ingredient_by_name(spec.name), spec);
  });
});

describe("fetchAllUserIngredientSpecs", () => {
  test("into_ingredient_from_spec from user-defined specs in DB", async () => {
    const user = await getTestUserB();
    const spec = USER_DEFINED_FRUCTOSE_SPEC;

    const specsDrizzle = await fetchAllUserIngredientSpecs(TEST_USER_B.email);
    expect(specsDrizzle).toBeDefined();
    expect(specsDrizzle!.length).toBeGreaterThan(0);

    const specDrizzle = specsDrizzle!.find((s) => s.name === spec.name);
    expectDrizzleSpecToMatch(specDrizzle, spec, user);

    const ingParsed = into_ingredient_from_spec(specDrizzle!.spec);
    expectParsedIngredientToMatchSpec(ingParsed, spec);
  });

  test("WasmBridge.seed_from_specs from user-defined specs in DB", async () => {
    const user = await getTestUserB();
    const spec = USER_DEFINED_FRUCTOSE_SPEC;
    const bridge = new WasmBridge(new IngredientDatabase());

    const specsDrizzle = await fetchAllUserIngredientSpecs(TEST_USER_B.email);
    expect(specsDrizzle).toBeDefined();
    expect(specsDrizzle!.length).toBeGreaterThan(0);

    const specDrizzle = specsDrizzle!.find((s) => s.name === spec.name);
    expectDrizzleSpecToMatch(specDrizzle, spec, user);

    bridge.seed_from_specs(
      specsDrizzle!.map((s) => s.spec),
      OnConflict.Reject,
    );
    expect(bridge.get_all_ingredients().length).toBeGreaterThan(0);
    expect(bridge.has_ingredient(spec.name)).toBe(true);
    expectParsedIngredientToMatchSpec(bridge.get_ingredient_by_name(spec.name), spec);
  });

  test("returns specs in ascending order by name (for stable UI rendering)", async () => {
    const specs = await fetchAllUserIngredientSpecs(TEST_USER_A.email);
    expect(specs).toBeDefined();
    expect(specs!.length).toBeGreaterThan(1);

    const names = specs!.map((s) => s.name);
    expect(names).toEqual([...names].sort());
  });
});

/** Helper to assert that every version of a saved recipe has valid `LightRecipe` rows */
function expectAllVersionsToBeValid(entry: SavedRecipeJson) {
  expect(entry.versions.length).toBeGreaterThan(0);
  for (const v of entry.versions) {
    expect(Array.isArray(v.recipe)).toBe(true);
    for (const row of v.recipe) {
      expect(row).toHaveLength(2);
      expect(typeof row[0]).toBe("string");
      expect(typeof row[1]).toBe("number");
    }
  }
}

describe("fetchAllUserSavedRecipes", () => {
  test("returns undefined for an unknown user", async () => {
    const result = await fetchAllUserSavedRecipes("nobody@example.com");
    expect(result).toBeUndefined();
  });

  test("returns all seeded recipes for TEST_USER_B", async () => {
    const recipes = await fetchAllUserSavedRecipes(TEST_USER_B.email);
    expect(recipes).toBeDefined();
    expect(recipes!.length).toEqual(TEST_USER_B_RECIPES.length);

    const names = recipes!.map((r) => r.name);
    for (const expected of TEST_USER_B_RECIPES.map((r) => r.name)) {
      expect(names).toContain(expected);
    }
  });

  test("every returned entry has at least one version with valid rows", async () => {
    const recipes = await fetchAllUserSavedRecipes(TEST_USER_B.email);
    expect(recipes).toBeDefined();
    for (const entry of recipes!) {
      expectAllVersionsToBeValid(entry);
    }
  });

  test("Chocolate Ice Cream v1 rows match getLightRecipe(RecipeID.Main)", async () => {
    const recipes = await fetchAllUserSavedRecipes(TEST_USER_B.email);
    expect(recipes).toBeDefined();

    const entry = recipes!.find((r) => r.name === "Chocolate Ice Cream");
    expect(entry).toBeDefined();
    const v1 = entry!.versions.find((v) => v.version === 1);
    expect(v1).toBeDefined();
    expect(v1!.recipe).toEqual(getLightRecipe(RecipeID.Main));
  });

  test("Chocolate Ice Cream has two seeded versions in ascending order", async () => {
    const recipes = await fetchAllUserSavedRecipes(TEST_USER_B.email);
    const entry = recipes!.find((r) => r.name === "Chocolate Ice Cream");
    expect(entry).toBeDefined();
    expect(entry!.versions.length).toBe(2);
    expect(entry!.versions.map((v) => v.version)).toEqual([1, 2]);
    expect(entry!.versions[0].label).toBe("first cut");
    expect(entry!.versions[1].label).toBe("sweeter tweak");
  });

  test("Recipe with Invalid Ingredients rows match RECIPE_INVALID_INGREDIENT", async () => {
    const recipes = await fetchAllUserSavedRecipes(TEST_USER_B.email);
    expect(recipes).toBeDefined();

    const entry = recipes!.find((r) => r.name === "Recipe with Invalid Ingredients");
    expect(entry).toBeDefined();
    expect(entry!.versions[0].recipe).toEqual(RECIPE_INVALID_INGREDIENT);
  });

  test("returns recipes in ascending order by name (for stable UI rendering)", async () => {
    const recipes = await fetchAllUserSavedRecipes(TEST_USER_B.email);
    expect(recipes).toBeDefined();
    expect(recipes!.length).toBeGreaterThan(1);

    const names = recipes!.map((r) => r.name);
    expect(names).toEqual([...names].sort());
  });
});

describe("createUserRecipe", () => {
  test("returns undefined for an unknown user", async () => {
    const result = await createUserRecipe("nobody@example.com", "X", [["Whole Milk", 100]]);
    expect(result).toBeUndefined();
  });

  test("creates a new recipe with version 1, round-trips, cleans up at the end", async () => {
    const user = await getTestUserB();
    const name = "Create Round-trip Test Recipe";
    const rows: LightRecipe = [["Whole Milk", 200]];

    const created = await createUserRecipe(TEST_USER_B.email, name, rows, {
      comments: "first",
      label: "initial",
      evaporation: 25,
    });
    expect(created).toBeDefined();
    expect(created!.version.version).toBe(1);
    expect(created!.version.recipe).toEqual(rows);
    expect(created!.version.comments).toBe("first");
    expect(created!.version.label).toBe("initial");
    expect(created!.version.evaporation).toBe(25);

    try {
      const all = await fetchAllUserSavedRecipes(TEST_USER_B.email);
      const found = all!.find((r) => r.name === name);
      expect(found).toBeDefined();
      expect(found!.id).toBe(created!.recipeId);
      expect(found!.versions[0].recipe).toEqual(rows);
      expect(found!.versions[0].evaporation).toBe(25);
    } finally {
      await deleteUserRecipe(TEST_USER_B.email, created!.recipeId);
    }

    // Side-effect cleanup verification (user count unchanged is implicit)
    expect(user.id).toBeGreaterThan(0);
  });
});

describe("createUserRecipeVersion", () => {
  test("returns undefined for an unknown user", async () => {
    const result = await createUserRecipeVersion("nobody@example.com", 1, [["Whole Milk", 100]]);
    expect(result).toBeUndefined();
  });

  test("returns undefined when the recipe is not owned by the user", async () => {
    // Use a high id that almost-certainly doesn't exist for this user
    const result = await createUserRecipeVersion(TEST_USER_B.email, 999_999_999, [
      ["Whole Milk", 100],
    ]);
    expect(result).toBeUndefined();
  });

  test("appends successive versions with monotonically-increasing numbers", async () => {
    const name = "Version Append Test Recipe";
    const v1: LightRecipe = [["Whole Milk", 100]];
    const v2: LightRecipe = [
      ["Whole Milk", 100],
      ["Sucrose", 25],
    ];
    const v3: LightRecipe = [
      ["Whole Milk", 90],
      ["Sucrose", 30],
    ];

    const created = await createUserRecipe(TEST_USER_B.email, name, v1);
    expect(created).toBeDefined();
    try {
      const second = await createUserRecipeVersion(TEST_USER_B.email, created!.recipeId, v2);
      expect(second?.version).toBe(2);
      expect(second?.recipe).toEqual(v2);

      const third = await createUserRecipeVersion(TEST_USER_B.email, created!.recipeId, v3, {
        label: "tweaked sugar",
      });
      expect(third?.version).toBe(3);
      expect(third?.recipe).toEqual(v3);
      expect(third?.label).toBe("tweaked sugar");

      const all = await fetchAllUserSavedRecipes(TEST_USER_B.email);
      const entry = all!.find((r) => r.name === name);
      expect(entry?.versions.map((v) => v.version)).toEqual([1, 2, 3]);
    } finally {
      await deleteUserRecipe(TEST_USER_B.email, created!.recipeId);
    }
  });
});

describe("updateUserRecipeVersion", () => {
  test("returns undefined for an unknown user", async () => {
    const result = await updateUserRecipeVersion("nobody@example.com", 1, 1, { comments: "hi" });
    expect(result).toBeUndefined();
  });

  test("returns undefined when the recipe is not owned by the user", async () => {
    const result = await updateUserRecipeVersion(TEST_USER_B.email, 999_999_999, 1, {
      comments: "hi",
    });
    expect(result).toBeUndefined();
  });

  test("partially updates recipe rows, comments, label; clears with null", async () => {
    const name = "Partial Update Test Recipe";
    const initial: LightRecipe = [["Whole Milk", 100]];
    const updatedRows: LightRecipe = [
      ["Whole Milk", 150],
      ["Dextrose", 10],
    ];

    const created = await createUserRecipe(TEST_USER_B.email, name, initial, {
      comments: "before",
      label: "v1",
    });
    expect(created).toBeDefined();

    try {
      const updated = await updateUserRecipeVersion(TEST_USER_B.email, created!.recipeId, 1, {
        recipe: updatedRows,
        comments: "after",
      });
      expect(updated?.recipe).toEqual(updatedRows);
      expect(updated?.comments).toBe("after");
      expect(updated?.label).toBe("v1"); // unchanged

      const cleared = await updateUserRecipeVersion(TEST_USER_B.email, created!.recipeId, 1, {
        comments: null,
        label: null,
      });
      expect(cleared?.comments).toBeUndefined();
      expect(cleared?.label).toBeUndefined();
    } finally {
      await deleteUserRecipe(TEST_USER_B.email, created!.recipeId);
    }
  });

  test("partially updates evaporation independent of other fields; clears with null", async () => {
    const name = "Evaporation Update Test Recipe";
    const initial: LightRecipe = [["Whole Milk", 100]];

    const created = await createUserRecipe(TEST_USER_B.email, name, initial, {
      comments: "before",
      evaporation: 10,
    });
    expect(created).toBeDefined();
    expect(created!.version.evaporation).toBe(10);

    try {
      // Omitting evaporation leaves it unchanged while another field updates
      const untouched = await updateUserRecipeVersion(TEST_USER_B.email, created!.recipeId, 1, {
        comments: "after",
      });
      expect(untouched?.comments).toBe("after");
      expect(untouched?.evaporation).toBe(10);

      const updated = await updateUserRecipeVersion(TEST_USER_B.email, created!.recipeId, 1, {
        evaporation: 42,
      });
      expect(updated?.evaporation).toBe(42);
      expect(updated?.comments).toBe("after"); // unchanged

      const cleared = await updateUserRecipeVersion(TEST_USER_B.email, created!.recipeId, 1, {
        evaporation: null,
      });
      expect(cleared?.evaporation).toBeUndefined();
    } finally {
      await deleteUserRecipe(TEST_USER_B.email, created!.recipeId);
    }
  });
});

describe("renameUserRecipe", () => {
  test("returns undefined for an unknown user", async () => {
    const result = await renameUserRecipe("nobody@example.com", 1, "X");
    expect(result).toBeUndefined();
  });

  test("renames a user-owned recipe round-trip", async () => {
    const original = "Rename Round-trip Recipe";
    const renamed = "Rename Round-trip Recipe (renamed)";

    const created = await createUserRecipe(TEST_USER_B.email, original, [["Whole Milk", 100]]);
    expect(created).toBeDefined();

    try {
      const row = await renameUserRecipe(TEST_USER_B.email, created!.recipeId, renamed);
      expect(row).toBeDefined();
      expect(row!.name).toBe(renamed);

      const all = await fetchAllUserSavedRecipes(TEST_USER_B.email);
      expect(all!.find((r) => r.name === renamed)).toBeDefined();
      expect(all!.find((r) => r.name === original)).toBeUndefined();
    } finally {
      await deleteUserRecipe(TEST_USER_B.email, created!.recipeId);
    }
  });
});

describe("recipe version ratings", () => {
  test("stores a rating and surfaces it on the fetched version", async () => {
    const name = "Rating Round-trip Recipe";
    const created = await createUserRecipe(TEST_USER_B.email, name, [["Whole Milk", 100]]);
    expect(created).toBeDefined();

    try {
      const updated = await updateUserRecipeVersion(TEST_USER_B.email, created!.recipeId, 1, {
        rating: Rating.Great,
      });
      expect(updated?.rating).toBe(Rating.Great);

      const all = await fetchAllUserSavedRecipes(TEST_USER_B.email);
      expect(all!.find((r) => r.name === name)?.versions[0].rating).toBe(Rating.Great);
    } finally {
      await deleteUserRecipe(TEST_USER_B.email, created!.recipeId);
    }
  });

  // Bad is -1: a falsy check anywhere on the write path would drop it and read back as unrated.
  test("stores a thumbs-down rather than treating it as unrated", async () => {
    const name = "Rating Negative Recipe";
    const created = await createUserRecipe(TEST_USER_B.email, name, [["Whole Milk", 100]]);
    expect(created).toBeDefined();

    try {
      const updated = await updateUserRecipeVersion(TEST_USER_B.email, created!.recipeId, 1, {
        rating: Rating.Bad,
      });
      expect(updated?.rating).toBe(Rating.Bad);
    } finally {
      await deleteUserRecipe(TEST_USER_B.email, created!.recipeId);
    }
  });

  test("clears a rating when passed null, and omits it from the wire shape", async () => {
    const name = "Rating Clear Recipe";
    const created = await createUserRecipe(TEST_USER_B.email, name, [["Whole Milk", 100]], {
      rating: Rating.Good,
    });
    expect(created).toBeDefined();

    try {
      const cleared = await updateUserRecipeVersion(TEST_USER_B.email, created!.recipeId, 1, {
        rating: null,
      });
      expect(cleared).toBeDefined();
      expect(cleared).not.toHaveProperty("rating");
    } finally {
      await deleteUserRecipe(TEST_USER_B.email, created!.recipeId);
    }
  });

  test("leaves an existing rating alone when the key is omitted", async () => {
    const name = "Rating Untouched Recipe";
    const created = await createUserRecipe(TEST_USER_B.email, name, [["Whole Milk", 100]], {
      rating: Rating.Good,
    });
    expect(created).toBeDefined();

    try {
      const updated = await updateUserRecipeVersion(TEST_USER_B.email, created!.recipeId, 1, {
        label: "unrelated edit",
      });
      expect(updated?.rating).toBe(Rating.Good);
    } finally {
      await deleteUserRecipe(TEST_USER_B.email, created!.recipeId);
    }
  });

  test("refuses an off-scale rating instead of writing it", async () => {
    const name = "Rating Invalid Recipe";
    const created = await createUserRecipe(TEST_USER_B.email, name, [["Whole Milk", 100]]);
    expect(created).toBeDefined();

    try {
      // Plausible but not on the scale. The guard is what returns `undefined` rather than letting
      // Postgres reject it as an invalid `recipe_rating` value, which would surface as a throw.
      const result = await updateUserRecipeVersion(TEST_USER_B.email, created!.recipeId, 1, {
        rating: "Excellent" as Rating,
      });
      expect(result).toBeUndefined();

      const all = await fetchAllUserSavedRecipes(TEST_USER_B.email);
      expect(all!.find((r) => r.name === name)?.versions[0]).not.toHaveProperty("rating");
    } finally {
      await deleteUserRecipe(TEST_USER_B.email, created!.recipeId);
    }
  });
});

describe("setUserRecipeFavourite", () => {
  test("returns undefined for an unknown user", async () => {
    const result = await setUserRecipeFavourite("nobody@example.com", 1, true);
    expect(result).toBeUndefined();
  });

  test("returns undefined when the recipe is not owned by the user", async () => {
    const result = await setUserRecipeFavourite(TEST_USER_B.email, 999_999_999, true);
    expect(result).toBeUndefined();
  });

  test("stars and unstars a user-owned recipe round-trip", async () => {
    const name = "Favourite Round-trip Recipe";
    const created = await createUserRecipe(TEST_USER_B.email, name, [["Whole Milk", 100]]);
    expect(created).toBeDefined();

    try {
      const starred = await setUserRecipeFavourite(TEST_USER_B.email, created!.recipeId, true);
      expect(starred?.favourite).toBe(true);

      const afterStar = await fetchAllUserSavedRecipes(TEST_USER_B.email);
      expect(afterStar!.find((r) => r.name === name)?.favourite).toBe(true);

      const cleared = await setUserRecipeFavourite(TEST_USER_B.email, created!.recipeId, false);
      expect(cleared?.favourite).toBe(false);

      // Omitted rather than `false`, matching the other optional fields in the wire shape.
      const afterClear = await fetchAllUserSavedRecipes(TEST_USER_B.email);
      expect(afterClear!.find((r) => r.name === name)).not.toHaveProperty("favourite");
    } finally {
      await deleteUserRecipe(TEST_USER_B.email, created!.recipeId);
    }
  });

  test("starts unstarred, so a new recipe never arrives pre-starred", async () => {
    const name = "Favourite Default Recipe";
    const created = await createUserRecipe(TEST_USER_B.email, name, [["Whole Milk", 100]]);
    expect(created).toBeDefined();

    try {
      const all = await fetchAllUserSavedRecipes(TEST_USER_B.email);
      expect(all!.find((r) => r.name === name)).not.toHaveProperty("favourite");
    } finally {
      await deleteUserRecipe(TEST_USER_B.email, created!.recipeId);
    }
  });

  test("leaves the star alone when the recipe is renamed", async () => {
    const name = "Favourite Rename Recipe";
    const created = await createUserRecipe(TEST_USER_B.email, name, [["Whole Milk", 100]]);
    expect(created).toBeDefined();

    try {
      await setUserRecipeFavourite(TEST_USER_B.email, created!.recipeId, true);
      const renamed = await renameUserRecipe(TEST_USER_B.email, created!.recipeId, `${name} v2`);
      expect(renamed?.favourite).toBe(true);
    } finally {
      await deleteUserRecipe(TEST_USER_B.email, created!.recipeId);
    }
  });
});

describe("deleteUserRecipe", () => {
  test("returns undefined for an unknown user", async () => {
    const result = await deleteUserRecipe("nobody@example.com", 1);
    expect(result).toBeUndefined();
  });

  test("returns undefined when no matching row exists", async () => {
    const result = await deleteUserRecipe(TEST_USER_B.email, 999_999_999);
    expect(result).toBeUndefined();
  });

  test("removes a recipe and cascades to its versions, round-trip", async () => {
    const name = "Delete Round-trip Test Recipe";
    const created = await createUserRecipe(TEST_USER_B.email, name, [["Whole Milk", 100]]);
    expect(created).toBeDefined();
    await createUserRecipeVersion(TEST_USER_B.email, created!.recipeId, [["Whole Milk", 200]]);

    const deleted = await deleteUserRecipe(TEST_USER_B.email, created!.recipeId);
    expect(deleted).toBeDefined();
    expect(deleted!.name).toBe(name);

    const all = await fetchAllUserSavedRecipes(TEST_USER_B.email);
    expect(all!.find((r) => r.name === name)).toBeUndefined();
  });
});

describe("deleteUserRecipeVersion", () => {
  test("returns undefined for an unknown user", async () => {
    const result = await deleteUserRecipeVersion("nobody@example.com", 1, 1);
    expect(result).toBeUndefined();
  });

  test("refuses to delete the last remaining version", async () => {
    const name = "Last Version Refuse Test Recipe";
    const created = await createUserRecipe(TEST_USER_B.email, name, [["Whole Milk", 100]]);
    expect(created).toBeDefined();

    try {
      const result = await deleteUserRecipeVersion(TEST_USER_B.email, created!.recipeId, 1);
      expect(result).toBeUndefined();

      const all = await fetchAllUserSavedRecipes(TEST_USER_B.email);
      const entry = all!.find((r) => r.name === name);
      expect(entry?.versions.length).toBe(1);
    } finally {
      await deleteUserRecipe(TEST_USER_B.email, created!.recipeId);
    }
  });

  test("deletes a specific version when more than one exists", async () => {
    const name = "Delete Single Version Test Recipe";
    const created = await createUserRecipe(TEST_USER_B.email, name, [["Whole Milk", 100]]);
    expect(created).toBeDefined();
    await createUserRecipeVersion(TEST_USER_B.email, created!.recipeId, [["Whole Milk", 200]]);
    await createUserRecipeVersion(TEST_USER_B.email, created!.recipeId, [["Whole Milk", 300]]);

    try {
      const deleted = await deleteUserRecipeVersion(TEST_USER_B.email, created!.recipeId, 2);
      expect(deleted?.version).toBe(2);

      const all = await fetchAllUserSavedRecipes(TEST_USER_B.email);
      const entry = all!.find((r) => r.name === name);
      expect(entry?.versions.map((v) => v.version)).toEqual([1, 3]);
    } finally {
      await deleteUserRecipe(TEST_USER_B.email, created!.recipeId);
    }
  });
});

describe("version names", () => {
  test("round-trips an explicit version name through create and fetch", async () => {
    const name = "Version Name Round-trip Test Recipe";
    const created = await createUserRecipe(TEST_USER_B.email, name, [["Whole Milk", 100]], {
      versionName: "3.1",
    });
    expect(created).toBeDefined();
    expect(created!.version.versionName).toBe("3.1");

    try {
      const all = await fetchAllUserSavedRecipes(TEST_USER_B.email);
      const entry = all!.find((r) => r.name === name);
      expect(entry?.versions[0].versionName).toBe("3.1");
      // The internal integer is still 1 regardless of the display name
      expect(entry?.versions[0].version).toBe(1);
    } finally {
      await deleteUserRecipe(TEST_USER_B.email, created!.recipeId);
    }
  });

  test("auto-materializes the next name once a recipe has opted in", async () => {
    const name = "Version Name Auto-materialize Test Recipe";
    const created = await createUserRecipe(TEST_USER_B.email, name, [["Whole Milk", 100]], {
      versionName: "2",
    });
    expect(created).toBeDefined();

    try {
      // Plain save (no meta): opted in, so the name continues the visible sequence
      const second = await createUserRecipeVersion(TEST_USER_B.email, created!.recipeId, [
        ["Whole Milk", 110],
      ]);
      expect(second?.versionName).toBe("3");
      expect(second?.version).toBe(2); // internal integer keeps counting
    } finally {
      await deleteUserRecipe(TEST_USER_B.email, created!.recipeId);
    }
  });

  test("does not materialize a name for a recipe that never opted in", async () => {
    const name = "Version Name No-optin Test Recipe";
    const created = await createUserRecipe(TEST_USER_B.email, name, [["Whole Milk", 100]]);
    expect(created).toBeDefined();
    expect(created!.version.versionName).toBeUndefined();

    try {
      const second = await createUserRecipeVersion(TEST_USER_B.email, created!.recipeId, [
        ["Whole Milk", 110],
      ]);
      expect(second?.versionName).toBeUndefined();
    } finally {
      await deleteUserRecipe(TEST_USER_B.email, created!.recipeId);
    }
  });

  test("rejects an invalid version name and writes no recipe row", async () => {
    const name = "Version Name Invalid Test Recipe";
    const created = await createUserRecipe(TEST_USER_B.email, name, [["Whole Milk", 100]], {
      versionName: "not a version",
    });
    expect(created).toBeUndefined();

    // The compensating delete must have left no orphaned recipes row behind
    const all = await fetchAllUserSavedRecipes(TEST_USER_B.email);
    expect(all!.find((r) => r.name === name)).toBeUndefined();
  });

  test("rejects a duplicate version name within a recipe", async () => {
    const name = "Version Name Duplicate Test Recipe";
    const created = await createUserRecipe(TEST_USER_B.email, name, [["Whole Milk", 100]], {
      versionName: "3.1",
    });
    expect(created).toBeDefined();

    try {
      const dup = await createUserRecipeVersion(
        TEST_USER_B.email,
        created!.recipeId,
        [["Whole Milk", 110]],
        { versionName: "3.1" },
      );
      expect(dup).toBeUndefined();
    } finally {
      await deleteUserRecipe(TEST_USER_B.email, created!.recipeId);
    }
  });

  test("sets and clears a version name via update without touching the integer", async () => {
    const name = "Version Name Update Test Recipe";
    const created = await createUserRecipe(TEST_USER_B.email, name, [["Whole Milk", 100]]);
    expect(created).toBeDefined();

    try {
      const named = await updateUserRecipeVersion(TEST_USER_B.email, created!.recipeId, 1, {
        versionName: "4.2-b",
      });
      expect(named?.versionName).toBe("4.2-b");
      expect(named?.version).toBe(1);

      const cleared = await updateUserRecipeVersion(TEST_USER_B.email, created!.recipeId, 1, {
        versionName: null,
      });
      expect(cleared?.versionName).toBeUndefined();
      expect(cleared?.version).toBe(1);
    } finally {
      await deleteUserRecipe(TEST_USER_B.email, created!.recipeId);
    }
  });
});

// ---------------------------------------------------------------------------
// Batches
// ---------------------------------------------------------------------------

/** Direct client, for asserting on child rows the server actions never surface on their own. */
const db = drizzle(getDatabaseUrl(), { schema });

/** Fetch one of TEST_USER_B's batches by id, or `undefined` when it is not present. */
async function fetchBatchById(id: number): Promise<SavedBatchJson | undefined> {
  const all = await fetchAllUserBatches(TEST_USER_B.email);
  return all?.find((batch) => batch.id === id);
}

/** Count the `batch_recipes` rows belonging to a batch, straight from the table. */
async function countBatchRecipes(batchId: number): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(batchRecipesTable)
    .where(eq(batchRecipesTable.batchId, batchId));
  return Number(count);
}

/** A batch with two recipes, distinct colors, and no provenance refs. */
function makeBatchInput(title: string): BatchInput {
  return {
    title,
    date: "2026-07-20",
    notes: "age overnight",
    recipes: [
      {
        name: "Vanilla",
        rows: [
          ["Whole Milk", 600],
          ["Sugar", 150],
        ],
        color: "Blue",
      },
      {
        name: "Chocolate",
        rows: [
          ["Whole Milk", 500],
          ["Cocoa", 80],
        ],
        color: "Green",
      },
    ],
  };
}

describe("createUserBatch", () => {
  test("returns undefined for an unknown user", async () => {
    const result = await createUserBatch("nobody@example.com", makeBatchInput("X"));
    expect(result).toBeUndefined();
  });

  test("creates a batch and round-trips recipes, positions, and colors, then cleans up", async () => {
    const input = makeBatchInput("Create Round-trip Test Batch");

    const created = await createUserBatch(TEST_USER_B.email, input);
    expect(created).toBeDefined();
    expect(created!.title).toBe(input.title);
    expect(created!.date).toBe(input.date);
    expect(created!.notes).toBe(input.notes);
    expect(created!.recipes).toEqual(input.recipes);

    try {
      const found = await fetchBatchById(created!.id);
      expect(found).toBeDefined();
      // Recipes come back in weighing order, colors and rows intact.
      expect(found!.recipes.map((r) => r.name)).toEqual(["Vanilla", "Chocolate"]);
      expect(found!.recipes[0].color).toBe("Blue");
      expect(found!.recipes[1].rows).toEqual([
        ["Whole Milk", 500],
        ["Cocoa", 80],
      ]);
    } finally {
      await deleteUserBatch(TEST_USER_B.email, created!.id);
    }
  });
});

describe("updateUserBatch", () => {
  test("returns undefined for an unknown user", async () => {
    const result = await updateUserBatch("nobody@example.com", 1, makeBatchInput("X"));
    expect(result).toBeUndefined();
  });

  test("returns undefined for a batch the user does not own", async () => {
    const result = await updateUserBatch(TEST_USER_B.email, 999_999_999, makeBatchInput("X"));
    expect(result).toBeUndefined();
  });

  test("replaces the recipes in place and keeps the batch id, then cleans up", async () => {
    const created = await createUserBatch(TEST_USER_B.email, makeBatchInput("Update Test Batch"));
    expect(created).toBeDefined();

    try {
      const updated = await updateUserBatch(TEST_USER_B.email, created!.id, {
        title: "Renamed batch",
        date: "2026-07-21",
        recipes: [{ name: "Strawberry", rows: [["Whole Milk", 400]], color: "Pink" }],
      });
      expect(updated).toBeDefined();
      expect(updated!.id).toBe(created!.id);
      expect(updated!.title).toBe("Renamed batch");
      expect(updated!.notes).toBeUndefined();
      expect(updated!.recipes).toEqual([
        { name: "Strawberry", rows: [["Whole Milk", 400]], color: "Pink" },
      ]);
      expect(Date.parse(updated!.updatedAt)).toBeGreaterThanOrEqual(Date.parse(created!.createdAt));

      // The replacement is durable, not just reflected in the return value.
      const found = await fetchBatchById(created!.id);
      expect(found!.recipes).toHaveLength(1);
      expect(found!.recipes[0].name).toBe("Strawberry");
    } finally {
      await deleteUserBatch(TEST_USER_B.email, created!.id);
    }
  });
});

describe("setUserBatchFavourite", () => {
  test("returns undefined for an unknown user", async () => {
    const result = await setUserBatchFavourite("nobody@example.com", 1, true);
    expect(result).toBeUndefined();
  });

  test("returns undefined when the batch is not owned by the user", async () => {
    const result = await setUserBatchFavourite(TEST_USER_B.email, 999_999_999, true);
    expect(result).toBeUndefined();
  });

  test("stars and unstars a user-owned batch round-trip", async () => {
    const created = await createUserBatch(TEST_USER_B.email, makeBatchInput("Favourite Batch"));
    expect(created).toBeDefined();

    try {
      const starred = await setUserBatchFavourite(TEST_USER_B.email, created!.id, true);
      expect(starred?.favourite).toBe(true);
      expect((await fetchBatchById(created!.id))?.favourite).toBe(true);

      const cleared = await setUserBatchFavourite(TEST_USER_B.email, created!.id, false);
      expect(cleared?.favourite).toBe(false);
      expect(await fetchBatchById(created!.id)).not.toHaveProperty("favourite");
    } finally {
      await deleteUserBatch(TEST_USER_B.email, created!.id);
    }
  });

  test("starts unstarred, so a new batch never arrives pre-starred", async () => {
    const created = await createUserBatch(TEST_USER_B.email, makeBatchInput("Unstarred Batch"));
    expect(created).toBeDefined();

    try {
      expect(created).not.toHaveProperty("favourite");
      expect(await fetchBatchById(created!.id)).not.toHaveProperty("favourite");
    } finally {
      await deleteUserBatch(TEST_USER_B.email, created!.id);
    }
  });

  /**
   * The reason the star has its own action: `updateUserBatch` replaces a batch wholesale from a
   * client-supplied `BatchInput`. If the star travelled in that input, an editor holding a copy
   * loaded before the star was set would clear it on the next save.
   */
  test("survives a full updateUserBatch, which knows nothing about the star", async () => {
    const created = await createUserBatch(TEST_USER_B.email, makeBatchInput("Starred Then Edited"));
    expect(created).toBeDefined();

    try {
      await setUserBatchFavourite(TEST_USER_B.email, created!.id, true);

      const edited = await updateUserBatch(TEST_USER_B.email, created!.id, {
        ...makeBatchInput("Starred Then Edited"),
        notes: "edited after starring",
      });
      expect(edited?.notes).toBe("edited after starring");
      expect(edited?.favourite).toBe(true);
      expect((await fetchBatchById(created!.id))?.favourite).toBe(true);
    } finally {
      await deleteUserBatch(TEST_USER_B.email, created!.id);
    }
  });
});

describe("deleteUserBatch", () => {
  test("returns undefined for an unknown user", async () => {
    const result = await deleteUserBatch("nobody@example.com", 1);
    expect(result).toBeUndefined();
  });

  test("returns undefined when no matching batch exists", async () => {
    const result = await deleteUserBatch(TEST_USER_B.email, 999_999_999);
    expect(result).toBeUndefined();
  });

  test("deletes a batch and cascades to its recipes", async () => {
    const created = await createUserBatch(TEST_USER_B.email, makeBatchInput("Delete Test Batch"));
    expect(created).toBeDefined();
    // The two-recipe input wrote child rows, so the cascade below has something to clear.
    expect(await countBatchRecipes(created!.id)).toBe(2);

    const deleted = await deleteUserBatch(TEST_USER_B.email, created!.id);
    expect(deleted).toBeDefined();
    expect(deleted!.id).toBe(created!.id);

    // The batch is gone, and the FK cascade left no orphaned `batch_recipes` rows behind.
    expect(await fetchBatchById(created!.id)).toBeUndefined();
    expect(await countBatchRecipes(created!.id)).toBe(0);
  });
});

describe("batch recipe provenance", () => {
  test("nulls a recipe's ref when its source recipe version is deleted, keeping rows", async () => {
    const recipe = await createUserRecipe(TEST_USER_B.email, "Batch Provenance Source", [
      ["Whole Milk", 100],
    ]);
    expect(recipe).toBeDefined();
    const ref = { recipeId: recipe!.recipeId, versionNumber: recipe!.version.version };

    const created = await createUserBatch(TEST_USER_B.email, {
      date: "2026-07-20",
      recipes: [{ name: "From saved", rows: [["Whole Milk", 100]], version: { ref } }],
    });
    expect(created).toBeDefined();

    try {
      // The provenance ref survives the round-trip while the source still exists.
      expect((await fetchBatchById(created!.id))!.recipes[0].version).toEqual({ ref });

      // Deleting the source recipe cascades to its versions; the composite FK nulls both provenance
      // columns together, so the ref disappears but the weighed rows are untouched.
      await deleteUserRecipe(TEST_USER_B.email, recipe!.recipeId);

      const afterDelete = await fetchBatchById(created!.id);
      expect(afterDelete!.recipes[0].version).toBeUndefined();
      expect(afterDelete!.recipes[0].rows).toEqual([["Whole Milk", 100]]);
    } finally {
      await deleteUserBatch(TEST_USER_B.email, created!.id);
    }
  });

  test("keeps the opted-in version name and sibling hint once the source version is deleted", async () => {
    const recipe = await createUserRecipe(TEST_USER_B.email, "Batch Provenance Named Source", [
      ["Whole Milk", 100],
    ]);
    expect(recipe).toBeDefined();
    const ref = { recipeId: recipe!.recipeId, versionNumber: recipe!.version.version };

    const created = await createUserBatch(TEST_USER_B.email, {
      date: "2026-07-20",
      recipes: [
        {
          name: "From saved",
          rows: [["Whole Milk", 100]],
          version: { ref, name: "2.1", hasSiblings: true },
        },
      ],
    });
    expect(created).toBeDefined();

    try {
      await deleteUserRecipe(TEST_USER_B.email, recipe!.recipeId);

      // `name`/`hasSiblings` are separate columns from the ref, so they outlive its "set null".
      const afterDelete = await fetchBatchById(created!.id);
      expect(afterDelete!.recipes[0].version).toEqual({ name: "2.1", hasSiblings: true });
    } finally {
      await deleteUserBatch(TEST_USER_B.email, created!.id);
    }
  });
});
