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
export const RECIPE_INVALID_INGREDIENT: [string, number][] = [
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

/** Shape of a recipe in the seed/test asset set: one identity with one or more versions */
export type SeedRecipeAsset = {
  name: string;
  versions: { recipe: [string, number][]; comments?: string; label?: string }[];
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
        ) as [string, number][],
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
];
