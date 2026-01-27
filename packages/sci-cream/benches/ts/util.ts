import { IngredientJson, into_ingredient_from_spec, RecipeLine, Recipe } from "../../dist/index.js";

export const LIGHT_RECIPE = [
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

export type SpecLine = { spec: IngredientJson; quantity: number };

export function makeRecipeLines(specLines: SpecLine[]): RecipeLine[] {
  return specLines.map(
    (specLine) => new RecipeLine(into_ingredient_from_spec(specLine.spec), specLine.quantity),
  );
}

export function cloneRecipeLines(recipeLines: RecipeLine[]): RecipeLine[] {
  return recipeLines.map(
    (recipeLine) => new RecipeLine(recipeLine.ingredient.clone(), recipeLine.amount),
  );
}

export function makeRecipeFromMadeLines(specLines: SpecLine[]): Recipe {
  return new Recipe("Chocolate Ice Cream", makeRecipeLines(specLines));
}

export function makeRecipeFromClonedLines(recipeLines: RecipeLine[]): Recipe {
  return new Recipe("Chocolate Ice Cream", cloneRecipeLines(recipeLines));
}
