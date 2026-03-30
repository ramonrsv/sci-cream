import {
  IngredientSpecJson,
  into_ingredient_from_spec,
  RecipeLine,
  Recipe,
} from "../../dist/index.js";

/** Sample chocolate ice cream light recipe used as benchmark input. */
export const LIGHT_RECIPE = [
  ["3.25% Milk", 245],
  ["35% Cream", 215],
  ["Cocoa Powder, 17% Fat", 28],
  ["Skimmed Milk Powder", 21],
  ["Egg Yolk", 18],
  ["Dextrose", 45],
  ["Fructose", 32],
  ["Salt", 0.5],
  ["Rich Ice Cream SB", 1.25],
  ["Vanilla Extract", 6],
];

export type SpecLine = { spec: IngredientSpecJson; quantity: number };

/** Converts an array of spec lines into `RecipeLine` instances by deserializing each ing. spec. */
export function makeRecipeLines(specLines: SpecLine[]): RecipeLine[] {
  return specLines.map(
    (specLine) => new RecipeLine(into_ingredient_from_spec(specLine.spec), specLine.quantity),
  );
}

/** Clones an array of `RecipeLine` instances by deep-copying their `Ingredient`s. */
export function cloneRecipeLines(recipeLines: RecipeLine[]): RecipeLine[] {
  return recipeLines.map(
    (recipeLine) => new RecipeLine(recipeLine.ingredient.clone(), recipeLine.amount),
  );
}

/** Builds a `Recipe` from freshly deserialized ingredient spec lines. */
export function makeRecipeFromMadeLines(specLines: SpecLine[]): Recipe {
  return new Recipe("Chocolate Ice Cream", makeRecipeLines(specLines));
}

/** Builds a `Recipe` from cloned recipe lines. */
export function makeRecipeFromClonedLines(recipeLines: RecipeLine[]): Recipe {
  return new Recipe("Chocolate Ice Cream", cloneRecipeLines(recipeLines));
}
