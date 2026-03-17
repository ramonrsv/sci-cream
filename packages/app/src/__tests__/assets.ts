import "dotenv/config";

export type LightRecipe = (string | number)[][];

export enum RecipeID {
  Main = "Recipe",
  RefA = "Ref A",
  RefB = "Ref B",
  MainWithUserDefined = "Recipe (with user-defined)",
  RefAWithUserDefined = "Ref A (with user-defined)",
  RefBWithUserDefined = "Ref B (with user-defined)",
}

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

export function lightRecipeToText(recipe: LightRecipe): string {
  const header = ["Ingredient", "Qty(g)"];
  const rows = recipe.map(([name, qty]) => [name, String(qty)]);
  return [header, ...rows].map((row) => row.join("\t")).join("\n");
}

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

export function getRecipeText(recipeId: RecipeID): string {
  return lightRecipeToText(getLightRecipe(recipeId));
}
