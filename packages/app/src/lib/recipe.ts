import { getLocalStorage, setLocalStorage, STORAGE_KEYS } from "@/lib/local-storage";
import { MAX_RECIPES, RECIPE_TOTAL_ROWS } from "@/lib/styles/sizes";
import { roundToStep, standardInputStepByPercent, verify } from "@/lib/util";

import { WasmResources } from "./wasm-resources";
import {
  Ingredient,
  MixProperties,
  RecipeLine,
  Recipe as SciCreamRecipe,
  type BalanceLocks,
  type LightRecipe,
  type LightRecipeLine,
} from "@workspace/sci-cream";

/** A single row in the recipe grid, holding the name, quantity, and resolved WASM `Ingredient` */
export interface IngredientRow {
  index: number;
  name: string;
  quantity?: number;
  ingredient?: Ingredient;
  /** If `true`, the balancer holds the row at its current amount and balances the rest around it */
  locked?: boolean;
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
  /**
   * Grams of water evaporated during preparation (undefined/0 = none); the final mix mass is
   * {@link effectiveMixTotal}, while `mixTotal` stays the unmodified ingredient lines sum.
   */
  evaporation?: number;
  mixProperties: MixProperties;
}

/**
 * Snapshot of a recipe's name and serialized rows taken at load time (or after a successful save).
 * Used by {@link isRecipeDirty} to detect unsaved edits; the `name` half is split out so callers
 * can also detect rename-at-save without re-parsing.
 */
export interface RecipeBaseline {
  name: string;
  serializedRows: string;
}

/**
 * Reference to a specific saved-recipe version. Grouped so the "both or neither" invariant is
 * enforced by the type — a Recipe either is or isn't tied to a saved version, never half-tied.
 */
export interface SavedRecipeRef {
  recipeId: number;
  versionNumber: number;
}

/**
 * Represents one recipe slot: idx, id, name, ingredient rows, mix total, and computed mix props.
 *
 * `savedRef` identifies the saved-recipe version this slot is currently editing (undefined for
 * anonymous/embedded recipes). `baseline` is a snapshot — captured on load and re-captured on
 * successful save — used by {@link isRecipeDirty} to detect unsaved edits.
 */
export interface Recipe extends RecipeSummary {
  index: number;
  ingredientRows: IngredientRow[];
  savedRef?: SavedRecipeRef;
  baseline?: RecipeBaseline;
  /**
   * Set when the last mix-property calculation threw (e.g. evaporation exceeds the mix's available
   * water); {@link mixProperties} then falls back to empty. Cleared on the next valid calculation.
   */
  mixError?: string;
}

/**
 * Represents a recipe in local storage, including name, serialized ingredient rows, and the
 * optional reference to the saved-recipe version being edited.
 */
export interface RecipeStore {
  name: string;
  serializedRows: string;
  savedRef?: SavedRecipeRef;
  /** Grid-row indices held fixed during balancing. Kept out of `serializedRows` (clipboard) */
  lockedRows?: number[];
  /** Grams of water evaporated. Sidecar like `lockedRows` — kept out of `serializedRows` */
  evaporation?: number;
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

/**
 * Returns `true` when a recipe has at least one row resolved to a valid WASM `Ingredient`,
 * regardless of quantity. Use this — not {@link isRecipeEmpty} — to gate balancing and target
 * validation, so a recipe with valid ingredients but zero/unset quantities is still balanceable.
 */
export function recipeHasIngredients(recipe: Recipe): boolean {
  return recipe.ingredientRows.some((row) => row.ingredient !== undefined);
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
 * Sum the defined quantities across rows resolved to a valid ingredient. Quantities on orphan rows
 * (blank or unknown ingredient name) are excluded, matching {@link makeLightRecipe}.
 *
 * Returns `undefined` when no valid-ingredient row has a defined quantity; a `0` still counts.
 */
export function calculateMixTotal(recipe: Recipe): number | undefined {
  return recipe.ingredientRows.reduce<number | undefined>(
    (sum, row) =>
      row.ingredient === undefined || row.quantity === undefined ? sum : (sum ?? 0) + row.quantity,
    undefined,
  );
}

/**
 * Final mix mass in grams (`mixTotal − evaporation`), or `undefined` for an empty recipe. Use this,
 * not `mixTotal`, as the denominator when converting a mix property's per-100g value to grams.
 */
export function effectiveMixTotal(recipe: RecipeSummary): number | undefined {
  return recipe.mixTotal === undefined ? undefined : recipe.mixTotal - (recipe.evaporation ?? 0);
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
 * Returns `true` when a row contributes to a light recipe: non-empty name and an ingredient name
 * known to the WASM resource database. Quantity may be undefined — see {@link makeLightRecipe}.
 */
export function isLightRecipeEligible(
  row: IngredientRow,
  hasIngredient: (name: string) => boolean,
): boolean {
  return row.name !== "" && hasIngredient(row.name);
}

/**
 * Returns `true` when a row can be locked for balancing: a known ingredient with a set amount.
 * A zero amount qualifies (locking pins it out at 0 g); only an unset quantity does not. Shared by
 * the editor lock control and {@link makeBalanceLocks}.
 */
export function isLockable(
  row: IngredientRow,
  hasIngredient: (name: string) => boolean,
): row is IngredientRow & { quantity: number } {
  return hasIngredient(row.name) && row.quantity !== undefined;
}

/**
 * Build a light recipe, i.e. a `[name, quantity]` array, from a `Recipe`, including only rows
 * eligible per {@link isLightRecipeEligible}. Rows with `quantity === undefined` are included
 * with a quantity of 0 — this lets the balancer fill them in via {@link makeBalancedRecipeUpdates}
 * while contributing nothing to a forward mix-property calculation.
 *
 * Suitable for passing into a `WasmBridge` method to calculate mix composition and/or properties,
 * without needing to clone every WASM `Ingredient`, which can be inefficient.
 */
export function makeLightRecipe(
  recipe: Recipe,
  hasIngredient: (name: string) => boolean,
): LightRecipe {
  return recipe.ingredientRows
    .filter((row) => isLightRecipeEligible(row, hasIngredient))
    .map((row) => [row.name, row.quantity ?? 0] as LightRecipeLine);
}

/**
 * Build the {@link BalanceLocks} list for `Bridge.balance_recipe` / `validate_recipe_targets`: one
 * `[lightRecipeIndex, { Amount }]` entry per locked, {@link isLockable} row. Indices are positions
 * within {@link makeLightRecipe}, so this applies the same {@link isLightRecipeEligible} filter
 * (line identity is positional). A locked zero-amount row pins the ingredient out at 0 g.
 *
 * `Amount` (absolute grams) over `Fraction` keeps a locked flavouring's taste-chosen grams when the
 * balancer resizes the batch to a pinned total.
 */
export function makeBalanceLocks(
  recipe: Recipe,
  hasIngredient: (name: string) => boolean,
): BalanceLocks {
  const locks: BalanceLocks = [];
  let lightIndex = 0;
  for (const row of recipe.ingredientRows) {
    if (!isLightRecipeEligible(row, hasIngredient)) continue;
    if (row.locked && isLockable(row, hasIngredient)) {
      locks.push([lightIndex, { Amount: row.quantity }]);
    }
    lightIndex++;
  }
  return locks;
}

/**
 * Return a new {@link RecipeContext} with each `updatedRecipe` written into its `.index` slot;
 * throws on out-of-range indices.
 *
 * Must be called inside a functional setter — closing over a stale context lets concurrent
 * same-tick updates silently overwrite each other:
 *
 * ```ts
 * setRecipeContext((prev) => makeUpdatedRecipeContext(prev, [updated]));
 * ```
 */
export function makeUpdatedRecipeContext(
  currentContext: RecipeContext,
  updatedRecipes: Recipe[],
): RecipeContext {
  const newRecipes = [...currentContext.recipes];
  for (const updatedRecipe of updatedRecipes) {
    verify(
      updatedRecipe.index >= 0 && updatedRecipe.index < currentContext.recipes.length,
      `recipe index ${updatedRecipe.index} out of range [0, ${currentContext.recipes.length})`,
    );
    newRecipes[updatedRecipe.index] = updatedRecipe;
  }
  return { ...currentContext, recipes: newRecipes };
}

/** Serialize a `Recipe` to a tab-separated string with a header row, suitable for clipboard copy */
export function stringifyRecipe(recipe: Recipe) {
  const formattedRecipe = recipe.ingredientRows
    .filter((row) => row.name !== "" || row.quantity !== undefined)
    .map((row) => `${row.name}\t${row.quantity ?? ""}`)
    .join("\n");

  return formattedRecipe ? `Ingredient\tQty(g)\n${formattedRecipe}` : "";
}

/** Capture a fresh {@link RecipeBaseline} for the current state of `recipe` */
export function makeRecipeBaseline(recipe: Recipe): RecipeBaseline {
  return { name: recipe.name, serializedRows: stringifyRecipe(recipe) };
}

/** Returns `true` when `recipe` was loaded from a saved version and has unsaved edits */
export function isRecipeDirty(recipe: Recipe): boolean {
  if (recipe.baseline === undefined) return false;
  return (
    recipe.name !== recipe.baseline.name ||
    stringifyRecipe(recipe) !== recipe.baseline.serializedRows
  );
}

/** Returns `true` when the recipe's name has changed since baseline (i.e. a rename is pending) */
export function isRecipeRenamed(recipe: Recipe): boolean {
  return recipe.baseline !== undefined && recipe.name !== recipe.baseline.name;
}

/** Returns a copy of `recipe` with saved-recipe identity (savedRef, baseline) cleared */
export function clearRecipeIdentity(recipe: Recipe): Recipe {
  return { ...recipe, savedRef: undefined, baseline: undefined };
}

/**
 * Returns a copy of `recipe` with saved-recipe identity set and a fresh `baseline` captured from
 * the current contents. Used by the editor after a successful save or save-as-new-version.
 */
export function withRecipeIdentity(recipe: Recipe, savedRef: SavedRecipeRef): Recipe {
  const next = { ...recipe, savedRef };
  next.baseline = makeRecipeBaseline(next);
  return next;
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
    // The WASM object in `currentRow.ingredient` may have been freed by `makeUpdatedRow`, so we
    // cannot check `currentRow.ingredient?.name` without risking a zero pointer error. We are
    // guaranteed that `updatedRow.ingredient` is either `undefined` or a new valid WASM object, so
    // we can safely check `updatedRow.ingredient?.name` to determine if the ingredient has changed.
    updatedRow.ingredient?.name !== currentRow.name ||
    currentRow.quantity !== updatedRow.quantity;
  return ret;
}

/**
 * Recalculate and assign mix properties for a recipe in-place.
 *
 * The previous `MixProperties` WASM object is freed first; any double-free errors for the
 * `MixProperties` object from concurrent React state updates are silently swallowed.
 *
 * A calculation that throws (e.g. evaporation exceeds the mix's available water) is caught: the
 * recipe falls back to empty mix properties and records the message in {@link Recipe.mixError}.
 */
export function updateMixProperties(recipe: Recipe, resources: WasmResources) {
  try {
    recipe.mixProperties.free();
  } catch {
    // Due to the asynchronous nature of React state updates, it's possible that the mixProperties
    // object has already been freed elsewhere. In such cases, we can safely ignore the error.
  }

  try {
    recipe.mixProperties =
      isRecipeEmpty(recipe) || !resources.wasmBridge
        ? new MixProperties()
        : resources.wasmBridge.calculate_recipe_mix_properties(
            makeLightRecipe(recipe, resources.hasIngredient),
            recipe.evaporation,
          );
    recipe.mixError = undefined;
  } catch (err) {
    recipe.mixProperties = new MixProperties();
    recipe.mixError = String(err);
  }
}

/** Serialize a `Recipe` to a `RecipeStore` object, preserving any saved-recipe identity and locks */
export function stringifyRecipeToStore(recipe: Recipe): RecipeStore {
  const lockedRows = recipe.ingredientRows.filter((row) => row.locked).map((row) => row.index);
  return {
    name: recipe.name,
    serializedRows: stringifyRecipe(recipe),
    ...(recipe.savedRef !== undefined && { savedRef: recipe.savedRef }),
    ...(lockedRows.length > 0 && { lockedRows }),
    ...(recipe.evaporation ? { evaporation: recipe.evaporation } : {}),
  };
}

/** Persist the passed `RecipeStore`s into `localStorage` */
export function setRecipeStoresToStorage(recipes: RecipeStore[]): void {
  setLocalStorage(STORAGE_KEYS.recipeStores, recipes);
}

/** Retrieve `RecipeStore`s from `localStorage`, default empty strings if none found */
export function getRecipeStoresFromStorage(): RecipeStore[] {
  return (
    getLocalStorage<RecipeStore[]>(STORAGE_KEYS.recipeStores) ??
    Array.from({ length: MAX_RECIPES }, () => ({ name: "", serializedRows: "" }))
  );
}

/** Represents updates to a `Recipe`, including optional name, row, and evaporation updates */
export interface RecipeUpdates {
  name?: string;
  rows?: IngredientRow[];
  /** New evaporation in grams; passing `0` clears it, `undefined` leaves it unchanged. */
  evaporation?: number;
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

  if (
    recipeUpdates.evaporation !== undefined &&
    recipeUpdates.evaporation !== (newRecipe.evaporation ?? 0)
  ) {
    newRecipe.evaporation = recipeUpdates.evaporation;
    needsMixPropUpdate = true;
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

/**
 * Parse a `RecipeStore` object and apply it to a `Recipe`, returning the updated recipe.
 *
 * Carries through the store's optional `savedRef` onto the resulting recipe and captures a fresh
 * `baseline` so dirty-detection starts clean after the load.
 */
export function makeUpdatedRecipeFromStore(
  currentRecipe: Recipe,
  recipeStore: RecipeStore,
  resources: WasmResources,
): Recipe {
  const parsedLines = parseRecipeString(recipeStore.serializedRows);
  const name = recipeStore.name;

  verify(
    parsedLines.length <= currentRecipe.ingredientRows.length,
    `Pasted recipe has ${parsedLines.length} rows, more than the ` +
      `${currentRecipe.ingredientRows.length} available in the recipe grid.`,
  );

  const lockedSet = new Set(recipeStore.lockedRows ?? []);
  const updatedRows = currentRecipe.ingredientRows.map((row, idx) => {
    const [name, qtyStr] = parsedLines[idx] || ["", ""];
    return { ...makeUpdatedRow(row, name, qtyStr, resources), locked: lockedSet.has(idx) };
  });

  const updated = makeUpdatedRecipe(
    { ...currentRecipe, savedRef: recipeStore.savedRef },
    // `?? 0` so a load/paste whose store carries no evaporation clears any stale value on the slot.
    { rows: updatedRows, name, evaporation: recipeStore.evaporation ?? 0 },
    resources,
  );

  // Only saved-recipe loads get a baseline; anonymous loads (no savedRef) stay free of dirty state
  updated.baseline = recipeStore.savedRef !== undefined ? makeRecipeBaseline(updated) : undefined;
  return updated;
}

/**
 * Build a {@link RecipeUpdates} from a balanced light recipe (output of `Bridge.balance_recipe`),
 * zipping `[name, grams][]` back onto eligible rows by index (same filter as
 * {@link makeLightRecipe}) and rounding each to the recipe input's step precision.
 *
 * Independent per-row rounding can leave the summed total slightly off the balancer's target; an
 * acceptable difference. An explicit total to `Bridge.balance_recipe` keeps a consistent result.
 *
 * Locked rows keep their current quantity verbatim (the balancer returns them fixed), so
 * re-rounding can't nudge them and a re-balance stays a fixed point.
 *
 * Pass the result to {@link makeUpdatedRecipe} to recalculate mix properties.
 *
 * Throws on length mismatch — `balance_recipe`' guarantees equal length, so it'd be a bug.
 */
export function makeBalancedRecipeUpdates(
  recipe: Recipe,
  balanced: LightRecipe,
  hasIngredient: (name: string) => boolean,
): RecipeUpdates {
  const eligibleIndices = recipe.ingredientRows.flatMap((row, i) =>
    isLightRecipeEligible(row, hasIngredient) ? [i] : [],
  );

  verify(
    eligibleIndices.length === balanced.length,
    `balanced length (${balanced.length}) does not match eligible row count (${eligibleIndices.length})`,
  );

  return {
    rows: eligibleIndices.map((i, balIdx) => {
      const row = recipe.ingredientRows[i];
      const quantity = row.locked
        ? row.quantity
        : roundToStep(balanced[balIdx][1], standardInputStepByPercent(balanced[balIdx][1], 1, 2));
      return { ...row, quantity };
    }),
  };
}
