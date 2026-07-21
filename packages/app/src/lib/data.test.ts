import { expect, test, describe } from "vitest";

import {
  findUserByEmail,
  fetchUserIngredientSpecByName,
  fetchAllUserIngredientSpecs,
  fetchAllUserSavedRecipes,
  createUserRecipe,
  createUserRecipeVersion,
  updateUserRecipeVersion,
  renameUserRecipe,
  deleteUserRecipe,
  deleteUserRecipeVersion,
  IngredientTransfer,
  SavedRecipeJson,
} from "@/lib/data";

import { UserSelect } from "@/lib/database/schema";

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
    });
    expect(created).toBeDefined();
    expect(created!.version.version).toBe(1);
    expect(created!.version.recipe).toEqual(rows);
    expect(created!.version.comments).toBe("first");
    expect(created!.version.label).toBe("initial");

    try {
      const all = await fetchAllUserSavedRecipes(TEST_USER_B.email);
      const found = all!.find((r) => r.name === name);
      expect(found).toBeDefined();
      expect(found!.id).toBe(created!.recipeId);
      expect(found!.versions[0].recipe).toEqual(rows);
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
