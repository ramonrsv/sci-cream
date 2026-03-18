"use client";

import { useState, useEffect, useRef } from "react";
import { GripVertical, ClipboardCopy, ClipboardPaste, Trash } from "lucide-react";

import { formatCompositionValue } from "@/lib/comp-value-format";
import { standardInputStepByPercent } from "../../lib/util";
import { RecipeSelect } from "@/app/_elements/selects/recipe-select";
import {
  MAX_RECIPES,
  RECIPE_TOTAL_ROWS,
  STD_COMPONENT_H_PX,
  COMPONENT_ACTION_ICON_SIZE,
  DRAG_HANDLE_ICON_SIZE,
} from "../../lib/styles/sizes";

import {
  Ingredient,
  MixProperties,
  IngredientDatabase,
  RecipeLine,
  Recipe as SciCreamRecipe,
  Bridge as WasmBridge,
  new_ingredient_database_seeded_from_embedded_data,
} from "@workspace/sci-cream";

/** A single row in the recipe grid, holding the name, quantity, and resolved WASM `Ingredient` */
export interface IngredientRow {
  index: number;
  name: string;
  quantity?: number;
  ingredient?: Ingredient;
}

/** Represents one recipe slot: its name, ingredient rows, mix total, and computed mix properties */
export interface Recipe {
  index: number;
  name: string;
  ingredientRows: IngredientRow[];
  mixTotal?: number;
  mixProperties: MixProperties;
}

/** Top-level context holding all recipe slots; passed as shared state through the component tree */
export interface RecipeContext {
  recipes: Recipe[];
}

/** Shared WASM resources: the bridge used for ingredient lookups and mix-property calculations */
export interface RecipeResources {
  updateIdx: number;
  wasmBridge: WasmBridge;
  hasIngredient(name: string): boolean;
}

/** `useState` tuple for `RecipeContext`, passed between components that read or update recipes */
export type RecipeContextState = [
  RecipeContext,
  React.Dispatch<React.SetStateAction<RecipeContext>>,
];

/** `useState` tuple for `RecipeResources`, passed between components that read/update resources */
export type RecipeResourcesState = [
  RecipeResources,
  React.Dispatch<React.SetStateAction<RecipeResources>>,
];

/** Create a blank `Recipe` at the given index with empty ingredient rows and `MixProperties` */
export function makeEmptyRecipe(recipeIdx: number): Recipe {
  return {
    index: recipeIdx,
    name: recipeIdx === 0 ? "Recipe" : `Ref ${String.fromCharCode(64 + recipeIdx)}`,
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

/** Wrap a `WasmBridge` in a `RecipeResources` object, creating a `hasIngredient` helper object */
export function makeRecipeResources(
  wasmBridge: WasmBridge,
  updateIdx: number = 0,
): RecipeResources {
  return {
    updateIdx,
    wasmBridge,
    hasIngredient: (name: string) => wasmBridge.has_ingredient(name),
  };
}

/** Create a `RecipeResources` backed by an empty (unseeded) ingredient database */
export function makeEmptyRecipeResources(): RecipeResources {
  return makeRecipeResources(new WasmBridge(new IngredientDatabase()));
}

/** Create a `RecipeResources` backed by the embedded (bundled) ingredient database */
export function makeRecipeResourcesFromEmbeddedData(): RecipeResources {
  return makeRecipeResources(new WasmBridge(new_ingredient_database_seeded_from_embedded_data()));
}

/** Returns `true` when a recipe has no ingredients (mix total is undefined or zero) */
export function isRecipeEmpty(recipe: Recipe): boolean {
  return recipe.mixTotal === undefined || recipe.mixTotal === 0;
}

/** Extract the numeric indices from an array of `Recipe` objects */
export function getRecipeIndices(recipes: Recipe[]): number[] {
  return recipes.map((recipe) => recipe.index);
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
    recipe.name,
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
export function updateMixProperties(recipe: Recipe, resources: RecipeResources) {
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

/**
 * Shallow-clone a `Recipe`, apply the given row updates, recalculate the mix total, and update mix
 * properties if necessary based on the nature of the row updates, returning the updated recipe.
 */
export function makeUpdatedRecipe(
  currentRecipe: Recipe,
  updatedRows: IngredientRow[],
  resources: RecipeResources,
): Recipe {
  const newRecipe = { ...currentRecipe, ingredientRows: [...currentRecipe.ingredientRows] };

  let needsMixPropUpdate = false;

  for (const updatedRow of updatedRows) {
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
  resources: RecipeResources,
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

/** Parse a tab-separated recipe string and apply it to a `Recipe`, returning the updated recipe */
export function makeUpdatedRecipeFromString(
  currentRecipe: Recipe,
  recipeStr: string,
  resources: RecipeResources,
): Recipe {
  const parsedLines = parseRecipeString(recipeStr);

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

  return makeUpdatedRecipe(currentRecipe, updatedRows, resources);
}

/**
 * Grid component for editing recipes, including all input handling logic for ingredient names and
 * quantities, actions for copying/pasting recipes, and all logic for updating the recipes context.
 *
 * This component is responsible for maintaining the integrity of the recipes context state,
 * ensuring that all updates to recipes are applied consistently and correctly, and updating the
 * `MixProperties` objects that are consumed by dependent components, e.g. `MixPropertiesGrid`, etc.
 */
export function RecipeGrid({
  props: {
    recipeCtxState: [recipeContext, setRecipeContext],
    recipeResourcesState: [recipeResources],
  },
}: {
  props: { recipeCtxState: RecipeContextState; recipeResourcesState: RecipeResourcesState };
}) {
  const { wasmBridge } = recipeResources;
  const { recipes: allRecipes } = recipeContext;
  const [currentRecipeIdx, setCurrentRecipeIdx] = useState<number>(0);

  const recipesRef = useRef(allRecipes);
  recipesRef.current = allRecipes;

  /**
   * Update multiple recipes at once, with a single state update.
   *
   * This is necessary when updating multiple recipes at once, e.g. in the useEffect to prevent
   * stale ingredient context, otherwise dependent components may asynchronously try to render stale
   * `Composition` or `MixProperties` objects, which can lead to crashes due to freed WASM memory.
   */
  const updateRecipes = (updatedRecipes: Recipe[]) => {
    const newRecipes = [...recipeContext.recipes];

    for (const updatedRecipe of updatedRecipes) {
      newRecipes[updatedRecipe.index] = updatedRecipe;
    }

    setRecipeContext({ ...recipeContext, recipes: newRecipes });
  };

  /** Update a single recipe in context by applying the given row changes */
  const updateRecipe = (recipeIdx: number, updatedRows: IngredientRow[]) => {
    updateRecipes([makeUpdatedRecipe(allRecipes[recipeIdx], updatedRows, recipeResources)]);
  };

  /** Update the currently selected recipe with the given row changes */
  const updateCurrentRecipe = (updatedRows: IngredientRow[]) => {
    updateRecipe(currentRecipeIdx, updatedRows);
  };

  /** Get the ingredient row at the given recipe and row indices */
  const getRow = (recipeIdx: number, rowIdx: number): IngredientRow => {
    return allRecipes[recipeIdx].ingredientRows[rowIdx];
  };

  /** Handle a name change for a row in the currently selected recipe */
  const updateCurrentIngredientRowName = (index: number, name: string) => {
    updateCurrentRecipe([
      makeUpdatedRow(getRow(currentRecipeIdx, index), name, undefined, recipeResources),
    ]);
  };

  /** Handle a quantity change for a row in the currently selected recipe */
  const updateCurrentIngredientRowQuantity = (index: number, quantityStr: string) => {
    updateCurrentRecipe([
      makeUpdatedRow(getRow(currentRecipeIdx, index), undefined, quantityStr, recipeResources),
    ]);
  };

  /** Parse and apply a tab-separated recipe string to the given recipe slot */
  const pasteRecipe = async (recipeIdx: number, recipeStr: string) => {
    updateRecipes([makeUpdatedRecipeFromString(allRecipes[recipeIdx], recipeStr, recipeResources)]);
  };

  /** Clear all ingredient rows in the given recipe slot */
  const clearRecipe = (recipeIdx: number) => {
    updateRecipe(
      recipeIdx,
      allRecipes[recipeIdx].ingredientRows.map((row) =>
        makeUpdatedRow(getRow(recipeIdx, row.index), "", "", recipeResources),
      ),
    );
  };

  /** Clear all ingredient rows in the currently selected recipe slot */
  const clearCurrentRecipe = () => {
    clearRecipe(currentRecipeIdx);
  };

  /** Copy the currently selected recipe as a tab-separated string to the clipboard */
  const copyCurrentRecipeToClipboard = async () => {
    await navigator.clipboard.writeText(stringifyRecipe(currentRecipe));
  };

  /** Read a tab-separated recipe string from clipboard and apply it to the current recipe slot */
  const pasteCurrentRecipeFromClipboard = async () => {
    await pasteRecipe(currentRecipeIdx, await navigator.clipboard.readText());
  };

  /** Retrieve serialized recipe strings from `localStorage`, default empty strings if none found */
  const getRecipeStringsFromStorage = () => {
    if (typeof window !== "undefined") {
      const storedRecipes = localStorage.getItem("recipes");
      if (storedRecipes) return JSON.parse(storedRecipes) as string[];
    }
    return allRecipes.map(() => "");
  };

  /** Serialize the current recipes and persist them to `localStorage` */
  const storeRecipesInStorage = async (recipes: Recipe[]) => {
    if (typeof window !== "undefined") {
      const recipeStrings = await Promise.all(recipes.map((recipe) => stringifyRecipe(recipe)));
      localStorage.setItem("recipes", JSON.stringify(recipeStrings));
    }
  };

  // Prevents stale ingredient context if a row is changed (e.g. a recipe is pasted) before we have
  // had a chance to fetch all user-defined ingredients and seed them into the wasmBridge database.
  useEffect(() => {
    updateRecipes(
      allRecipes.map((recipe) =>
        makeUpdatedRecipe(
          recipe,
          recipe.ingredientRows.map((row) =>
            makeUpdatedRow(row, row.name, row.quantity?.toString(), recipeResources),
          ),
          recipeResources,
        ),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeResources.updateIdx]);

  // On initial load, populate recipes from local storage
  useEffect(() => {
    updateRecipes(
      getRecipeStringsFromStorage().map((recipeStr, idx) =>
        makeUpdatedRecipeFromString(allRecipes[idx], recipeStr, recipeResources),
      ),
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Periodically store recipes to local storage
  useEffect(() => {
    const intervalID = setInterval(() => {
      storeRecipesInStorage(recipesRef.current);
    }, 2000);
    return () => clearInterval(intervalID);
  }, []);

  const currentRecipe = allRecipes[currentRecipeIdx];
  const mixTotal = currentRecipe.mixTotal;

  const iconSize = COMPONENT_ACTION_ICON_SIZE;

  return (
    <div id="recipe-grid" className="grid-component" style={{ height: `${STD_COMPONENT_H_PX}px` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <GripVertical size={DRAG_HANDLE_ICON_SIZE} className="drag-handle" />
          <RecipeSelect
            allRecipes={allRecipes}
            enabledRecipeIndices={getRecipeIndices(allRecipes)}
            currentRecipeIdxState={[currentRecipeIdx, setCurrentRecipeIdx]}
          />
        </div>
        {/* Action Buttons */}
        <div className="flex">
          {[
            {
              label: <ClipboardCopy size={iconSize} />,
              action: copyCurrentRecipeToClipboard,
              title: "Copy recipe to clipboard",
            },
            {
              label: <ClipboardPaste size={iconSize} />,
              action: pasteCurrentRecipeFromClipboard,
              title: "Paste recipe from clipboard",
            },
            { label: <Trash size={iconSize} />, action: clearCurrentRecipe, title: "Clear recipe" },
          ].map(({ label, action, title }, idx) => (
            <button key={idx} onClick={action} title={title} className="action-button px-1 py-0.75">
              {label}
            </button>
          ))}
        </div>
      </div>
      {/* Hidden Ingredients List */}
      <datalist id="valid-ingredients">
        {wasmBridge.get_all_ingredients().map((ingredient) => (
          <option key={ingredient.name} value={ingredient.name} />
        ))}
      </datalist>
      <table className="w-full">
        {/* Header */}
        <thead>
          <tr className="h-6.25 text-center">
            <th className="table-header min-w-50">Ingredient</th>
            <th className="table-header w-15">Qty (g)</th>
            <th className="table-header w-13.75 pr-1 pl-2 whitespace-nowrap">Qty (%)</th>
          </tr>
          {/* Total Row */}
          <tr className="h-6.25">
            <td className="table-header px-1 text-center">Total</td>
            <td className="table-header comp-val px-3.75">{mixTotal ? mixTotal.toFixed(0) : ""}</td>
            <td className="table-header comp-val px-1">{mixTotal ? "100   " : ""}</td>
          </tr>
        </thead>
        <tbody>
          {/* Ingredient Rows */}
          {/* @todo The ingredient/input rows are not respecting < h-6/[25px]; not sure why yet */}
          {currentRecipe.ingredientRows.map((row) => (
            <tr key={row.index} className="h-6.25">
              {/* Ingredient Name Input */}
              <td className="table-inner-cell">
                <input
                  type="search"
                  value={row.name}
                  onChange={(e) => updateCurrentIngredientRowName(row.index, e.target.value)}
                  className={`table-fillable-input ${
                    row.name === "" || recipeResources.hasIngredient(row.name)
                      ? "focus:ring-blue-400"
                      : "-outline-offset-2 outline-red-400 outline-solid focus:ring-red-400"
                  } w-full px-2`}
                  placeholder=""
                  list="valid-ingredients"
                />
              </td>
              {/* Ingredient Quantity Input */}
              <td className="table-inner-cell">
                <input
                  type="number"
                  value={row.quantity?.toString() || ""}
                  onChange={(e) => updateCurrentIngredientRowQuantity(row.index, e.target.value)}
                  placeholder=""
                  step={standardInputStepByPercent(row.quantity, 2.5, 10)}
                  min={0}
                  className="table-fillable-input w-full text-right font-mono"
                />
              </td>
              {/* Ingredient Quantity Percentage Display */}
              <td className="table-inner-cell comp-val px-1">
                {row.quantity && mixTotal
                  ? formatCompositionValue((row.quantity / mixTotal) * 100)
                  : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
