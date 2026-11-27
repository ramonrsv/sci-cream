// Generated from the `data/recipes/*.md` sources by `scripts/gen-data.ts` (`pnpm gen:data`).
// These carry `comments` and file intros with footnote definitions inline; do not edit by hand.
import underbellyJson from "../../data/recipes/generated/full/underbelly.json";
import corvittoJson from "../../data/recipes/generated/full/corvitto.json";
import danaCreeJson from "../../data/recipes/generated/full/dana-cree.json";
import iceCreamScienceJson from "../../data/recipes/generated/full/ice-cream-science.json";

import introsJson from "../../data/recipes/generated/full/intros.json";

import { type DataFileIntro } from "./data.ingredients";
import { LightRecipe } from "./light-recipe";

export type RecipeEntryJson = {
  name: string;
  author?: string;
  recipe: LightRecipe;
  /** Grams of water evaporated during preparation, if any (mirrors `RecipeEntry::evaporation`). */
  evaporation?: number;
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

/** Each recipe JSON file's entries, by the file's name, as `intros.json` keys it. */
const ENTRIES_BY_FILE: Record<string, InferredRecipeEntryJson[]> = {
  underbelly: underbellyJson,
  corvitto: corvittoJson,
  "dana-cree": danaCreeJson,
  "ice-cream-science": iceCreamScienceJson,
};

/** All built-in recipe entries aggregated from every recipe JSON file. */
export const allRecipeEntries = flattenLists(Object.values(ENTRIES_BY_FILE));

/** Each recipe's file intro, by recipe ID, for the files that have one. */
const INTRO_BY_RECIPE = new Map(
  Object.entries(ENTRIES_BY_FILE).flatMap(([file, entries]) => {
    const intro = (introsJson as Record<string, DataFileIntro | undefined>)[file];
    if (intro === undefined) return [];
    return entries.map((entry) => [recipeEntryId(entry), intro] as const);
  }),
);

/** The intro of the data file that defines `entry`, or `undefined` if that file has none. */
export function recipeEntryIntro(entry: RecipeEntryJson): DataFileIntro | undefined {
  return INTRO_BY_RECIPE.get(recipeEntryId(entry));
}

/** Returns the ID of a recipe entry, meant to match `RecipeEntry::gen_id`. */
export function recipeEntryId(entry: Pick<RecipeEntryJson, "name" | "author">): string {
  return entry.author ? `${entry.author}: ${entry.name}` : entry.name;
}
