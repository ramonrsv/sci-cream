"use client";

import { useState, useEffect, useRef } from "react";
import { GripVertical, ClipboardCopy, ClipboardPaste, Trash } from "lucide-react";

import { formatCompositionValue } from "../lib/ui/comp-values";
import { standardInputStepByPercent } from "../lib/util";
import { RecipeSelect } from "@/lib/ui/recipe-select";
import {
  MAX_RECIPES,
  RECIPE_TOTAL_ROWS,
  STD_COMPONENT_H_PX,
  COMPONENT_ACTION_ICON_SIZE,
  DRAG_HANDLE_ICON_SIZE,
} from "./page";

import {
  Ingredient,
  MixProperties,
  IngredientDatabase,
  RecipeLine,
  Recipe as SciCreamRecipe,
  Bridge as WasmBridge,
} from "@workspace/sci-cream";

export interface IngredientRow {
  index: number;
  name: string;
  quantity?: number;
  ingredient?: Ingredient;
}

export interface Recipe {
  index: number;
  name: string;
  ingredientRows: IngredientRow[];
  mixTotal?: number;
  mixProperties: MixProperties;
}

export interface RecipeContext {
  recipes: Recipe[];
}

export interface RecipeResources {
  validIngredients: string[];
  wasmBridge: WasmBridge;
}

export type RecipeContextState = [
  RecipeContext,
  React.Dispatch<React.SetStateAction<RecipeContext>>,
];

export type RecipeResourcesState = [
  RecipeResources,
  React.Dispatch<React.SetStateAction<RecipeResources>>,
];

export function makeEmptyRecipeContext(): RecipeContext {
  return {
    recipes: Array.from({ length: MAX_RECIPES }, (_, recipeIdx) => ({
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
    })),
  };
}

export function makeEmptyRecipeResources(): RecipeResources {
  return { validIngredients: [], wasmBridge: new WasmBridge(new IngredientDatabase()) };
}

export function isRecipeEmpty(recipe: Recipe): boolean {
  return recipe.mixTotal === undefined || recipe.mixTotal === 0;
}

export function getRecipeIndices(recipes: Recipe[]): number[] {
  return recipes.map((recipe) => recipe.index);
}

export function calculateMixTotal(recipe: Recipe) {
  return recipe.ingredientRows.reduce(
    (sum: number | undefined, row) =>
      sum === undefined && row.quantity == undefined ? undefined : (sum || 0) + (row.quantity || 0),
    undefined,
  );
}

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

export function makeLightRecipe(recipe: Recipe, validIngredients: string[]): [string, number][] {
  return recipe.ingredientRows
    .filter(
      (row) => row.name !== "" && row.quantity !== undefined && validIngredients.includes(row.name),
    )
    .map((row) => [row.name, row.quantity!] as [string, number]);
}

export function stringifyRecipe(recipe: Recipe) {
  const formattedRecipe = recipe.ingredientRows
    .filter((row) => row.name !== "" || row.quantity !== undefined)
    .map((row) => `${row.name}\t${row.quantity ?? ""}`)
    .join("\n");

  return formattedRecipe ? `Ingredient\tQty(g)\n${formattedRecipe}` : "";
}

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
          makeLightRecipe(recipe, resources.validIngredients),
        );
}

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

  const isValidIng = row.name !== "" && resources.validIngredients.includes(row.name);
  const needsIngUpdate = !isValidIng || !row.ingredient || row.ingredient.name !== row.name;

  if (needsIngUpdate) {
    if (row.ingredient) row.ingredient.free();
    row.ingredient = isValidIng ? resources.wasmBridge.get_ingredient_by_name(row.name) : undefined;
  }

  return row;
}

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

export function RecipeGrid({
  props: {
    recipeCtxState: [recipeContext, setRecipeContext],
    recipeResourcesState: [recipeResources],
  },
}: {
  props: { recipeCtxState: RecipeContextState; recipeResourcesState: RecipeResourcesState };
}) {
  const { validIngredients } = recipeResources;
  const { recipes: allRecipes } = recipeContext;
  const [currentRecipeIdx, setCurrentRecipeIdx] = useState<number>(0);

  const recipesRef = useRef(allRecipes);
  recipesRef.current = allRecipes;

  /** Update multiple recipes at once, with a single state update.
   *
   * This is necessary when updating multiple recipes at once, e.g. in the useEffect to prevent
   * stale ingredient context, otherwise dependent components may asynchronously try to render stale
   * Composition or MixProperties objects, which can lead to crashes due to freed WASM memory.
   */
  const updateRecipes = (updatedRecipes: Recipe[]) => {
    const newRecipes = [...recipeContext.recipes];

    for (const updatedRecipe of updatedRecipes) {
      newRecipes[updatedRecipe.index] = updatedRecipe;
    }

    setRecipeContext({ ...recipeContext, recipes: newRecipes });
  };

  const updateRecipe = (recipeIdx: number, updatedRows: IngredientRow[]) => {
    updateRecipes([makeUpdatedRecipe(allRecipes[recipeIdx], updatedRows, recipeResources)]);
  };

  const updateCurrentRecipe = (updatedRows: IngredientRow[]) => {
    updateRecipe(currentRecipeIdx, updatedRows);
  };

  const getRow = (recipeIdx: number, rowIdx: number): IngredientRow => {
    return allRecipes[recipeIdx].ingredientRows[rowIdx];
  };

  const updateCurrentIngredientRowName = (index: number, name: string) => {
    updateCurrentRecipe([
      makeUpdatedRow(getRow(currentRecipeIdx, index), name, undefined, recipeResources),
    ]);
  };

  const updateCurrentIngredientRowQuantity = (index: number, quantityStr: string) => {
    updateCurrentRecipe([
      makeUpdatedRow(getRow(currentRecipeIdx, index), undefined, quantityStr, recipeResources),
    ]);
  };

  const pasteRecipe = async (recipeIdx: number, recipeStr: string) => {
    updateRecipes([makeUpdatedRecipeFromString(allRecipes[recipeIdx], recipeStr, recipeResources)]);
  };

  const clearRecipe = (recipeIdx: number) => {
    updateRecipe(
      recipeIdx,
      allRecipes[recipeIdx].ingredientRows.map((row) =>
        makeUpdatedRow(getRow(recipeIdx, row.index), "", "", recipeResources),
      ),
    );
  };

  const clearCurrentRecipe = () => {
    clearRecipe(currentRecipeIdx);
  };

  const copyCurrentRecipeToClipboard = async () => {
    await navigator.clipboard.writeText(stringifyRecipe(currentRecipe));
  };

  const pasteCurrentRecipeFromClipboard = async () => {
    await pasteRecipe(currentRecipeIdx, await navigator.clipboard.readText());
  };

  const getRecipeStringsFromStorage = () => {
    if (typeof window !== "undefined") {
      const storedRecipes = localStorage.getItem("recipes");
      if (storedRecipes) return JSON.parse(storedRecipes) as string[];
    }
    return allRecipes.map(() => "");
  };

  const storeRecipesInStorage = async (recipes: Recipe[]) => {
    if (typeof window !== "undefined") {
      const recipeStrings = await Promise.all(recipes.map((recipe) => stringifyRecipe(recipe)));
      localStorage.setItem("recipes", JSON.stringify(recipeStrings));
    }
  };

  // Prevents stale ingredient context if a row is changed (e.g. a recipe is pasted) before we have
  // had a chance to fetch all valid ingredients and populate validIngredients and the wasmBridge.
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
  }, [recipeResources]);

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
        {validIngredients.map((name) => (
          <option key={name} value={name} />
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
                    row.name === "" || validIngredients.includes(row.name)
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
