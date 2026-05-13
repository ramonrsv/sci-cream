import { expect, test, describe } from "vitest";

import {
  findUserByEmail,
  fetchUserIngredientSpecByName,
  fetchAllUserIngredientSpecs,
  fetchAllUserSavedRecipes,
  upsertUserRecipe,
  updateUserRecipeComments,
  deleteUserRecipe,
  IngredientTransfer,
} from "@/lib/data";

import { UserSelect } from "@/lib/database/schema";

import {
  into_ingredient_from_spec,
  Category,
  Ingredient,
  Composition,
  Bridge as WasmBridge,
  IngredientDatabase,
  allRecipeEntries,
  type RecipeEntryJson,
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

    bridge.seed_from_specs([specDrizzle!.spec]);
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

    bridge.seed_from_specs(specsDrizzle!.map((s) => s.spec));
    expect(bridge.get_all_ingredients().length).toBeGreaterThan(0);
    expect(bridge.has_ingredient(spec.name)).toBe(true);
    expectParsedIngredientToMatchSpec(bridge.get_ingredient_by_name(spec.name), spec);
  });
});

/** Helper to assert that every row in a recipe is a [string, number] pair */
function expectRecipeRowsToBeValid(recipe: RecipeEntryJson) {
  expect(Array.isArray(recipe.recipe)).toBe(true);
  for (const row of recipe.recipe) {
    expect(row).toHaveLength(2);
    expect(typeof row[0]).toBe("string");
    expect(typeof row[1]).toBe("number");
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

  test("every returned entry has valid [string, number] recipe rows", async () => {
    const recipes = await fetchAllUserSavedRecipes(TEST_USER_B.email);
    expect(recipes).toBeDefined();
    for (const entry of recipes!) {
      expectRecipeRowsToBeValid(entry);
    }
  });

  test("Chocolate Ice Cream rows match getLightRecipe(RecipeID.Main)", async () => {
    const recipes = await fetchAllUserSavedRecipes(TEST_USER_B.email);
    expect(recipes).toBeDefined();

    const entry = recipes!.find((r) => r.name === "Chocolate Ice Cream");
    expect(entry).toBeDefined();
    expect(entry!.recipe).toEqual(getLightRecipe(RecipeID.Main));
  });

  test("Recipe with Invalid Ingredients rows match RECIPE_INVALID_INGREDIENT", async () => {
    const recipes = await fetchAllUserSavedRecipes(TEST_USER_B.email);
    expect(recipes).toBeDefined();

    const entry = recipes!.find((r) => r.name === "Recipe with Invalid Ingredients");
    expect(entry).toBeDefined();
    expect(entry!.recipe).toEqual(RECIPE_INVALID_INGREDIENT);
  });

  test("returns allRecipeEntries for TEST_USER_A", async () => {
    const recipes = await fetchAllUserSavedRecipes(TEST_USER_A.email);
    expect(recipes).toBeDefined();
    expect(recipes!.length).toBe(allRecipeEntries.length);

    const names = recipes!.map((r) => r.name);
    const expectedNames = allRecipeEntries.map((e) => e.name);
    for (const expected of expectedNames) {
      expect(names).toContain(expected);
    }
  });
});

describe("upsertUserRecipe", () => {
  test("returns undefined for an unknown user", async () => {
    const result = await upsertUserRecipe("nobody@example.com", "X", [["Whole Milk", 100]]);
    expect(result).toBeUndefined();
  });

  test("inserts then updates a recipe round-trip, cleaning up at the end", async () => {
    const name = "Round-trip Test Recipe";
    const initial: [string, number][] = [["Whole Milk", 200]];
    const updated: [string, number][] = [
      ["Whole Milk", 300],
      ["Sucrose", 50],
    ];

    try {
      const inserted = await upsertUserRecipe(TEST_USER_B.email, name, initial);
      expect(inserted).toBeDefined();
      expect(inserted!.name).toBe(name);
      expect(inserted!.recipe).toEqual(initial);

      const updatedRow = await upsertUserRecipe(TEST_USER_B.email, name, updated);
      expect(updatedRow).toBeDefined();
      expect(updatedRow!.recipe).toEqual(updated);

      const all = await fetchAllUserSavedRecipes(TEST_USER_B.email);
      const found = all!.find((r) => r.name === name);
      expect(found!.recipe).toEqual(updated);
    } finally {
      await deleteUserRecipe(TEST_USER_B.email, name);
    }
  });
});

describe("updateUserRecipeComments", () => {
  test("returns undefined for an unknown user", async () => {
    const result = await updateUserRecipeComments("nobody@example.com", "X", "hi");
    expect(result).toBeUndefined();
  });

  test("returns undefined when no matching row exists", async () => {
    const result = await updateUserRecipeComments(
      TEST_USER_B.email,
      "definitely-not-a-real-recipe",
      "hi",
    );
    expect(result).toBeUndefined();
  });

  test("sets and clears comments round-trip", async () => {
    const name = "Comments Round-trip Test Recipe";
    await upsertUserRecipe(TEST_USER_B.email, name, [["Whole Milk", 100]]);

    try {
      const set = await updateUserRecipeComments(TEST_USER_B.email, name, "Tasty stuff.");
      expect(set?.comments).toBe("Tasty stuff.");

      const fetched = (await fetchAllUserSavedRecipes(TEST_USER_B.email))!.find(
        (r) => r.name === name,
      );
      expect(fetched?.comments).toBe("Tasty stuff.");

      const cleared = await updateUserRecipeComments(TEST_USER_B.email, name, "");
      expect(cleared?.comments).toBeNull();

      const fetchedAfter = (await fetchAllUserSavedRecipes(TEST_USER_B.email))!.find(
        (r) => r.name === name,
      );
      expect(fetchedAfter?.comments).toBeUndefined();
    } finally {
      await deleteUserRecipe(TEST_USER_B.email, name);
    }
  });
});

describe("deleteUserRecipe", () => {
  test("returns undefined for an unknown user", async () => {
    const result = await deleteUserRecipe("nobody@example.com", "X");
    expect(result).toBeUndefined();
  });

  test("returns undefined when no matching row exists", async () => {
    const result = await deleteUserRecipe(TEST_USER_B.email, "definitely-not-a-real-recipe");
    expect(result).toBeUndefined();
  });

  test("removes a recipe round-trip", async () => {
    const name = "Delete Round-trip Test Recipe";
    await upsertUserRecipe(TEST_USER_B.email, name, [["Whole Milk", 100]]);

    const deleted = await deleteUserRecipe(TEST_USER_B.email, name);
    expect(deleted).toBeDefined();
    expect(deleted!.name).toBe(name);

    const all = await fetchAllUserSavedRecipes(TEST_USER_B.email);
    expect(all!.find((r) => r.name === name)).toBeUndefined();
  });
});
