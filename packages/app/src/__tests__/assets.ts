import "dotenv/config";

export type LightRecipe = (string | number)[][];

export enum RecipeID {
  Main = "Recipe",
  RefA = "Ref A",
  RefB = "Ref B",
}

export function recipeIdToIdx(recipeId: RecipeID): number {
  return recipeId === RecipeID.Main ? 0 : recipeId === RecipeID.RefA ? 1 : 2;
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
  switch (recipeId) {
    case RecipeID.Main:
      return MAIN_RECIPE_LIGHT;
    case RecipeID.RefA:
      return REF_A_RECIPE_LIGHT;
    case RecipeID.RefB:
      return REF_B_RECIPE_LIGHT;
  }
}

export function getRecipeText(recipeId: RecipeID): string {
  return lightRecipeToText(getLightRecipe(recipeId));
}
