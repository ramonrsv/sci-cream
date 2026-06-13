import type { LightRecipe } from "@workspace/sci-cream";

import { getLightRecipe, RecipeID } from "@/__tests__/assets";

/** Credentials for test user A, used in seeding and integration tests. */
export const TEST_USER_A = {
  name: "SciCream Tester A",
  email: "a.tester@sci-cream.ca",
  password: "password123",
};

/** Credentials for test user B, used in seeding and integration tests. */
export const TEST_USER_B = {
  name: "SciCream Tester B",
  email: "b.tester@sci-cream.ca",
  password: "password123",
};

/** Example user-defined fructose ingredient spec, used in seeding and integration tests. */
export const USER_DEFINED_FRUCTOSE_SPEC = {
  name: "Fructose (User-Defined)",
  category: "Sweetener",
  SweetenerSpec: { sweeteners: { sugars: { fructose: 100 } }, ByDryWeight: { solids: 100 } },
};

/** Example recipe with an invalid ingredient, used in seeding and integration tests. */
export const RECIPE_INVALID_INGREDIENT: LightRecipe = [
  ["Whole Milk", 230],
  ["Whipping Cream", 235],
  ["Skimmed Milk Powder", 35],
  ["Egg Yolk", 36],
  ["Sucrose (invalid)", 35],
  ["Dextrose", 25],
  ["Fructose", 6],
  ["Salt", 0.5],
  ["Stabilizer Blend (invalid)", 0.84],
];

/**
 * Example recipe containing a valid ingredient with an unusually long name, used to verify that the
 * recipe table truncates the name instead of widening the table and breaking the layout.
 */
export const RECIPE_LONG_INGREDIENT_NAME: LightRecipe = [
  ["Whole Milk", 500],
  ["Eagle Brand Dulce de Leche Caramel Flavoured Sauce", 100],
  ["Sucrose", 80],
];

/** Shape of a recipe in the seed/test asset set: one identity with one or more versions */
export type SeedRecipeAsset = {
  name: string;
  versions: { recipe: LightRecipe; comments?: string; label?: string }[];
};

/** Example recipes for TEST_USER_B, used in seeding and integration tests. */
export const TEST_USER_B_RECIPES: SeedRecipeAsset[] = [
  {
    name: "Chocolate Ice Cream",
    versions: [
      {
        recipe: getLightRecipe(RecipeID.Main),
        comments: "Rich, dark, and bittersweet. Let the mix ripen overnight before churning.",
        label: "first cut",
      },
      {
        recipe: getLightRecipe(RecipeID.Main).map(([n, q]) =>
          n === "Sucrose" ? [n, q + 5] : [n, q],
        ) as LightRecipe,
        comments: "Slightly sweeter — bumped sucrose by 5g for a less bitter finish.",
        label: "sweeter tweak",
      },
    ],
  },
  { name: "Standard Base", versions: [{ recipe: getLightRecipe(RecipeID.RefA) }] },
  { name: "Sugar-Free Base", versions: [{ recipe: getLightRecipe(RecipeID.RefB) }] },
  {
    name: "Chocolate Ice Cream (with user-defined)",
    versions: [{ recipe: getLightRecipe(RecipeID.MainWithUserDefined) }],
  },
  {
    name: "Standard Base (with user-defined)",
    versions: [{ recipe: getLightRecipe(RecipeID.RefAWithUserDefined) }],
  },
  {
    name: "Sugar-Free Base (with user-defined)",
    versions: [{ recipe: getLightRecipe(RecipeID.RefBWithUserDefined) }],
  },
  { name: "Recipe with Invalid Ingredients", versions: [{ recipe: RECIPE_INVALID_INGREDIENT }] },
  { name: "Recipe with Long Ingredient Name", versions: [{ recipe: RECIPE_LONG_INGREDIENT_NAME }] },
];
