import underbellyJson from "../../data/recipes/underbelly.json";
import iceCreamScienceJson from "../../data/recipes/ice-cream-science.json";

import { LightRecipe } from "./light-recipe";

export type RecipeEntryJson = {
  name: string;
  author?: string;
  recipe: LightRecipe;
  [key: string]: unknown;
};

type InferredRecipeEntryJson = (typeof underbellyJson)[number];

/**
 * Merges multiple recipe entry lists into a single flat array.
 *
 * This function takes the more permissive `InferredRecipeEntryJson` type (which is the inferred
 * type of the raw JSON data) and casts it to the stricter `RecipeEntryJson` type for export.
 */
function flattenLists(jsonLists: InferredRecipeEntryJson[][]): RecipeEntryJson[] {
  return jsonLists
    .reduce((acc, list) => acc.concat(list), [])
    .map(({ recipe, ...rest }) => ({ ...rest, recipe: recipe as LightRecipe }));
}

/** All built-in recipe entries aggregated from every recipe JSON file. */
export const allRecipeEntries = flattenLists([underbellyJson, iceCreamScienceJson]);

/** Returns the ID of a recipe entry, meant to match `RecipeEntry::gen_id`. */
export function recipeEntryId(entry: RecipeEntryJson): string {
  return entry.author ? `${entry.author}: ${entry.name}` : entry.name;
}
