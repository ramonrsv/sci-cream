import { getLocalStorage, setLocalStorage } from "@/lib/local-storage";
import { MAX_RECIPES, RECIPE_TOTAL_ROWS } from "@/lib/styles/sizes";

import { WasmResources } from "./wasm-resources";
import {
  Ingredient,
  MixProperties,
  RecipeLine,
  Recipe as SciCreamRecipe,
} from "@workspace/sci-cream";

/** A single row in the recipe grid, holding the name, quantity, and resolved WASM `Ingredient` */
export interface IngredientRow {
  index: number;
  name: string;
  quantity?: number;
  ingredient?: Ingredient;
}

/**
 * Slim shape of a recipe sufficient for properties/chart display: identifier, computed mix total,
 * and computed mix properties. Suitable for read-only views that don't need the ingredient rows
 * (e.g. recipe search results), avoiding the cost of cloning WASM `Ingredient` objects per row.
 *
 * The `id` field is used both as a display label and a React key for callers that render lists,
 * and must be unique within a list passed to display components.
 */
export interface RecipeSummary {
  /** Fixed slot identifier string (e.g. "Recipe", "Ref A"), for display purposes */
  id: string;
  /** User-defined display name for this recipe, e.g. "Standard Base", etc., default "" */
  name: string;
  mixTotal?: number;
  mixProperties: MixProperties;
}

/** Represents one recipe slot: idx, id, name, ingredient rows, mix total, and computed mix props */
export interface Recipe extends RecipeSummary {
  index: number;
  ingredientRows: IngredientRow[];
}

/** Represents a recipe in local storage, including name and serialized ingredient rows */
export interface RecipeStore {
  name: string;
  serializedRows: string;
}

/** Top-level context holding all recipe slots; passed as shared state through the component tree */
export interface RecipeContext {
  recipes: Recipe[];
}

/** `useState` tuple for `RecipeContext`, passed between components that read or update recipes */
export type RecipeContextState = [
  RecipeContext,
  React.Dispatch<React.SetStateAction<RecipeContext>>,
];

/** Generate the corresponding recipe ID for a given index */
export function makeRecipeId(recipeIdx: number): string {
  return recipeIdx === 0 ? "Recipe" : `Ref ${String.fromCharCode(64 + recipeIdx)}`;
}

/** Create a blank `Recipe` at the given index with empty ingredient rows and `MixProperties` */
export function makeEmptyRecipe(recipeIdx: number): Recipe {
  return {
    index: recipeIdx,
    id: makeRecipeId(recipeIdx),
    name: "",
    ingredientRows: Array.from({ length: RECIPE_TOTAL_ROWS }, (_, rowIdx) => ({
      index: rowIdx,
      name: "",
      quantity: undefined,
      ingredient: undefined,
    })),
    mixTotal: undefined,
    mixProperties: new MixProperties(),
  };
}

/** Create a `RecipeContext` with `MAX_RECIPES` empty recipe slots */
export function makeEmptyRecipeContext(): RecipeContext {
  return {
    recipes: Array.from({ length: MAX_RECIPES }, (_, recipeIdx) => makeEmptyRecipe(recipeIdx)),
  };
}

/** Returns `true` when a recipe has no ingredients (mix total is undefined or zero) */
export function isRecipeEmpty(recipe: RecipeSummary): boolean {
  return recipe.mixTotal === undefined || recipe.mixTotal === 0;
}

/** Extract the numeric indices from an array of `Recipe` objects */
export function getRecipeIndices(recipes: Recipe[]): number[] {
  return recipes.map((recipe) => recipe.index);
}

/**
 * Slot-filter for the calculator: keeps the main recipe (slot 0) plus any non-empty reference
 * recipes. Used by display panels that should always show the main recipe column even when blank,
 * but otherwise omit empty reference slots from the rendering.
 */
export function filterActiveSlots(recipes: Recipe[]): Recipe[] {
  return recipes.filter((r) => r.index === 0 || !isRecipeEmpty(r));
}

/**
 * Sum the defined quantities across all ingredient rows.
 *
 * Returns `undefined` when every row quantity is undefined (i.e. the recipe is completely empty).
 */
export function calculateMixTotal(recipe: Recipe) {
  return recipe.ingredientRows.reduce(
    (sum: number | undefined, row) =>
      sum === undefined && row.quantity == undefined ? undefined : (sum || 0) + (row.quantity || 0),
    undefined,
  );
}

/**
 * Build a WASM `SciCreamRecipe` from a `Recipe`, including only rows with both a valid ingredient
 * name that has been resolved to a WASM `Ingredient` in the resources, and a valid quantity.
 *
 * The resulting `SciCreamRecipe` WASM object can be used to calculate mix properties.
 *
 * **Note:** The `SciCreamRecipe` object should be freed manually to avoid memory leaks. This
 * function also clones every WASM `Ingredient` in the recipe, which can be inefficient. Prefer
 * using {@link makeLightRecipe} and a {@link WasmBridge} to avoid these issues when possible.
 */
export function makeSciCreamRecipe(recipe: Recipe): SciCreamRecipe {
  return new SciCreamRecipe(
    recipe.name || recipe.id,
    recipe.ingredientRows
      .filter((row) => row.ingredient !== undefined && row.quantity !== undefined)
      .map((row) => {
        return new RecipeLine(row.ingredient!.clone(), row.quantity!);
      }),
  );
}

/**
 * Build a light recipe, i.e. a `[name, quantity]` array, from a `Recipe`, including only rows with
 * a non-empty name, a valid quantity, and where the WASM resource database has the ingredient name.
 *
 * This is suitable for passing into a `WasmBridge` method to calculate mix composition and/or
 * properties, without needing to clone every WASM `Ingredient`, which can be inefficient.
 */
export function makeLightRecipe(
  recipe: Recipe,
  hasIngredient: (name: string) => boolean,
): [string, number][] {
  return recipe.ingredientRows
    .filter((row) => row.name !== "" && row.quantity !== undefined && hasIngredient(row.name))
    .map((row) => [row.name, row.quantity!] as [string, number]);
}

/** Serialize a `Recipe` to a tab-separated string with a header row, suitable for clipboard copy */
export function stringifyRecipe(recipe: Recipe) {
  const formattedRecipe = recipe.ingredientRows
    .filter((row) => row.name !== "" || row.quantity !== undefined)
    .map((row) => `${row.name}\t${row.quantity ?? ""}`)
    .join("\n");

  return formattedRecipe ? `Ingredient\tQty(g)\n${formattedRecipe}` : "";
}

/** Parse a tab-separated recipe string (with or without header) into `[name, quantityStr]` pairs */
export function parseRecipeString(recipeStr: string): [string, string][] {
  try {
    let lines = recipeStr.trim().split("\n");
    if (lines[0]?.includes("Ingredient")) lines = lines.slice(1);

    return lines.map((line) => {
      const parts = line.split("\t");
      const name = parts[0]?.trim() || "";
      const quantityStr = parts[1]?.trim() || "";
      return [name, quantityStr];
    });
  } catch (err) {
    throw new Error("Failed to parse recipe string:", { cause: err });
  }
}

/** Returns `true` when an ingredient row change requires mix properties to be recalculated */
export function requiresMixPropsUpdate(
  currentRow: IngredientRow,
  updatedRow: IngredientRow,
): boolean {
  const ret =
    !!currentRow.ingredient !== !!updatedRow.ingredient ||
    updatedRow.ingredient?.name !== currentRow.ingredient?.name ||
    currentRow.quantity !== updatedRow.quantity;
  return ret;
}

/**
 * Recalculate and assign mix properties for a recipe in-place.
 *
 * The previous `MixProperties` WASM object is freed first; any double-free errors for the
 * `MixProperties` object from concurrent React state updates are silently swallowed.
 */
export function updateMixProperties(recipe: Recipe, resources: WasmResources) {
  try {
    recipe.mixProperties.free();
  } catch {
    // Due to the asynchronous nature of React state updates, it's possible that the mixProperties
    // object has already been freed elsewhere. In such cases, we can safely ignore the error.
  }

  recipe.mixProperties =
    isRecipeEmpty(recipe) || !resources.wasmBridge
      ? new MixProperties()
      : resources.wasmBridge.calculate_recipe_mix_properties(
          makeLightRecipe(recipe, resources.hasIngredient),
        );
}

/** Serialize a `Recipe` to a `RecipeStore` object */
export function stringifyRecipeToStore(recipe: Recipe): RecipeStore {
  return { name: recipe.name, serializedRows: stringifyRecipe(recipe) };
}

/** Persist the passed `RecipeStore`s into `localStorage` */
export function setRecipeStoresToStorage(recipes: RecipeStore[]): void {
  setLocalStorage("recipe-stores", recipes);
}

/** Retrieve `RecipeStore`s from `localStorage`, default empty strings if none found */
export function getRecipeStoresFromStorage(): RecipeStore[] {
  return (
    getLocalStorage<RecipeStore[]>("recipe-stores") ??
    Array.from({ length: MAX_RECIPES }, () => ({ name: "", serializedRows: "" }))
  );
}

/** Represents updates to a `Recipe`, including optional name and row updates */
export interface RecipeUpdates {
  name?: string;
  rows?: IngredientRow[];
}

/**
 * Shallow-clone a `Recipe`, apply the given recipe updates, recalculate the mix total, and update
 * mix properties if necessary based on the nature of the row updates, returning the updated recipe.
 */
export function makeUpdatedRecipe(
  currentRecipe: Recipe,
  recipeUpdates: RecipeUpdates,
  resources: WasmResources,
): Recipe {
  const newRecipe = { ...currentRecipe, ingredientRows: [...currentRecipe.ingredientRows] };
  newRecipe.name = recipeUpdates.name ?? newRecipe.name;

  let needsMixPropUpdate = false;

  for (const updatedRow of recipeUpdates.rows ?? []) {
    const currentRow = newRecipe.ingredientRows[updatedRow.index];
    newRecipe.ingredientRows[updatedRow.index] = updatedRow;
    needsMixPropUpdate = needsMixPropUpdate || requiresMixPropsUpdate(currentRow, updatedRow);
  }

  newRecipe.mixTotal = calculateMixTotal(newRecipe);

  if (needsMixPropUpdate) updateMixProperties(newRecipe, resources);
  return newRecipe;
}

/**
 * Produce an updated `IngredientRow` from optional name and quantity-string overrides.
 *
 * Resolves the WASM `Ingredient` when the name is valid and has changed, freeing the previous one.
 */
export function makeUpdatedRow(
  currentRow: IngredientRow,
  _name: string | undefined,
  quantityStr: string | undefined,
  resources: WasmResources,
): IngredientRow {
  const row = { ...currentRow };
  row.name = _name === undefined ? row.name : _name;

  row.quantity =
    quantityStr === undefined
      ? row.quantity
      : quantityStr === ""
        ? undefined
        : parseFloat(quantityStr);

  const isValidIng = row.name !== "" && resources.hasIngredient(row.name);
  const needsIngUpdate = !isValidIng || !row.ingredient || row.ingredient.name !== row.name;

  if (needsIngUpdate) {
    if (row.ingredient) row.ingredient.free();
    row.ingredient = isValidIng ? resources.wasmBridge.get_ingredient_by_name(row.name) : undefined;
  }

  return row;
}

/** Parse a `RecipeStore` object and apply it to a `Recipe`, returning the updated recipe */
export function makeUpdatedRecipeFromStore(
  currentRecipe: Recipe,
  recipeStore: RecipeStore,
  resources: WasmResources,
): Recipe {
  const parsedLines = parseRecipeString(recipeStore.serializedRows);
  const name = recipeStore.name;

  if (parsedLines.length > currentRecipe.ingredientRows.length) {
    throw new Error(
      `Pasted recipe has ${parsedLines.length} rows, more than the ` +
        `${currentRecipe.ingredientRows.length} available in the recipe grid.`,
    );
  }

  const updatedRows = currentRecipe.ingredientRows.map((row, idx) => {
    const [name, qtyStr] = parsedLines[idx] || ["", ""];
    return makeUpdatedRow(row, name, qtyStr, resources);
  });

  return makeUpdatedRecipe(currentRecipe, { rows: updatedRows, name }, resources);
}
