import "dotenv/config";

/** A lightweight recipe representation as an array of `[ingredientName, quantity]` pairs */
export type LightRecipe = (string | number)[][];

/** Identifies one of the test recipes, including variants that include user-defined ingredients */
export enum RecipeID {
  Main = "Recipe",
  RefA = "Ref A",
  RefB = "Ref B",
  MainWithUserDefined = "Recipe (with user-defined)",
  RefAWithUserDefined = "Ref A (with user-defined)",
  RefBWithUserDefined = "Ref B (with user-defined)",
}

/**
 * Map a `RecipeID` to its zero-based index in the recipe array (Main = 0, RefA = 1, RefB = 2)
 *
 * **Note:** The variants with user-defined ingredients share the same index as their base recipe,
 * since they only differ by the presence of user-defined ingredients, but are input into the app
 * using the same `RecipeGrid` slot, and so are displayed in the same position in other components.
 */
export function recipeIdToIdx(recipeId: RecipeID): number {
  switch (recipeId) {
    case RecipeID.Main:
    case RecipeID.MainWithUserDefined:
      return 0;
    case RecipeID.RefA:
    case RecipeID.RefAWithUserDefined:
      return 1;
    case RecipeID.RefB:
    case RecipeID.RefBWithUserDefined:
      return 2;
    default:
      throw new Error(`Invalid recipeId: ${recipeId}`);
  }
}

/**
 * Map a `RecipeID` to the display string used as the `<select>` option value
 *
 * **Note:** The variants with user-defined ingredients share the same string as their base recipe.
 */
export function recipeIdToOption(recipeId: RecipeID): string {
  switch (recipeId) {
    case RecipeID.Main:
    case RecipeID.MainWithUserDefined:
      return "Recipe";
    case RecipeID.RefA:
    case RecipeID.RefAWithUserDefined:
      return "Ref A";
    case RecipeID.RefB:
    case RecipeID.RefBWithUserDefined:
      return "Ref B";
    default:
      throw new Error(`Invalid recipeId: ${recipeId}`);
  }
}

/** Light recipe data for the main test recipe */
const MAIN_RECIPE_LIGHT = [
  ["Whole Milk", 245],
  ["Whipping Cream", 215],
  ["Cocoa Powder, 17% Fat", 28],
  ["Skimmed Milk Powder", 21],
  ["Egg Yolk", 18],
  ["Dextrose", 45],
  ["Fructose", 32],
  ["Salt", 0.5],
  ["Rich Ice Cream SB", 1.25],
  ["Vanilla Extract", 6],
];

/** Light recipe data for the reference A test recipe */
const REF_A_RECIPE_LIGHT = [
  ["Whole Milk", 230],
  ["Whipping Cream", 235],
  ["Skimmed Milk Powder", 35],
  ["Egg Yolk", 36],
  ["Sucrose", 35],
  ["Dextrose", 25],
  ["Fructose", 6],
  ["Salt", 0.5],
  ["Rich Ice Cream SB", 0.84],
];

/** Light recipe data for the reference B test recipe */
const REF_B_RECIPE_LIGHT = [
  ["Whole Milk", 230],
  ["Whipping Cream", 225],
  ["Skimmed Milk Powder", 35],
  ["Egg Yolk", 36],
  ["Sucrose", 10],
  ["Dextrose", 2],
  ["Fructose", 2],
  ["Honey", 5],
  ["Splenda (Sucralose)", 2],
  ["SweetLeaf Stevia", 0.8],
  ["Salt", 0.5],
  ["Rich Ice Cream SB", 0.9],
  ["Grand Marnier Cordon Rouge", 53],
];

/** Serialize a `LightRecipe` to tab-separated text with a header row, suitable for clipboard paste */
export function lightRecipeToText(recipe: LightRecipe): string {
  const header = ["Ingredient", "Qty(g)"];
  const rows = recipe.map(([name, qty]) => [name, String(qty)]);
  return [header, ...rows].map((row) => row.join("\t")).join("\n");
}

/**
 * Return the `LightRecipe` for the given `RecipeID`, with possible modifications for user-defined
 *
 * For the variants with user-defined ingredients, replace "Fructose" with "Fructose (User-Defined)"
 * and add a new "Fructose (User-Defined)" ingredient with quantity 5g, to ensure that the
 * user-defined ingredient is present in the recipe, and that the original fructose is not used,
 * which would interfere with testing the user-defined ingredient functionality.
 */
export function getLightRecipe(recipeId: RecipeID): LightRecipe {
  const replaceAndConcatFructose = (base: LightRecipe) =>
    base
      .map(([name, qty]) => [name == "Fructose" ? "Fructose (User-Defined)" : name, qty])
      .concat([["Fructose (User-Defined)", 5]]);

  switch (recipeId) {
    case RecipeID.Main:
      return MAIN_RECIPE_LIGHT;
    case RecipeID.RefA:
      return REF_A_RECIPE_LIGHT;
    case RecipeID.RefB:
      return REF_B_RECIPE_LIGHT;
    case RecipeID.MainWithUserDefined:
      return replaceAndConcatFructose(MAIN_RECIPE_LIGHT);
    case RecipeID.RefAWithUserDefined:
      return replaceAndConcatFructose(REF_A_RECIPE_LIGHT);
    case RecipeID.RefBWithUserDefined:
      return replaceAndConcatFructose(REF_B_RECIPE_LIGHT);
  }
}

/** Convenience wrapper for calls to {@link getLightRecipe} and {@link lightRecipeToText} */
export function getRecipeText(recipeId: RecipeID): string {
  return lightRecipeToText(getLightRecipe(recipeId));
}
