"use client";

import { useState, useEffect } from "react";

import { formatCompositionValue } from "../lib/ui/comp-values";
import { standardInputStepByPercent } from "../lib/util";
import { MAX_RECIPES, RECIPE_TOTAL_ROWS, STD_COMPONENT_H_PX } from "./page";
import { recipeCompBgColor } from "@/lib/styles/colors";

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
      name: recipeIdx === 0 ? "Recipe" : `Ref ${recipeIdx}`,
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

export function RecipeGrid({
  props: {
    recipeCtxState: [recipeContext, setRecipeContext],
    recipeResourcesState: [recipeResources],
    enabledRecipeIndices: enabledRecipeIndices,
  },
}: {
  props: {
    recipeCtxState: RecipeContextState;
    recipeResourcesState: RecipeResourcesState;
    enabledRecipeIndices: number[] | undefined;
  };
}) {
  const indices = enabledRecipeIndices ? enabledRecipeIndices : [0];

  const { validIngredients, wasmBridge } = recipeResources;
  const { recipes } = recipeContext;
  const [currentRecipeIdx, setCurrentRecipeIdx] = useState<number>(indices[0]);

  const recipe = recipes[currentRecipeIdx];

  const requiresMixPropsUpdate = (
    currentRow: IngredientRow,
    updatedRow: IngredientRow,
  ): boolean => {
    const ret =
      !!currentRow.ingredient !== !!updatedRow.ingredient ||
      updatedRow.ingredient?.name !== currentRow.ingredient?.name ||
      currentRow.quantity !== updatedRow.quantity;
    return ret;
  };

  const updateMixProperties = (recipe: Recipe) => {
    try {
      recipe.mixProperties.free();
    } catch {
      // Due to the asynchronous nature of React state updates, it's possible that the mixProperties
      // object has already been freed elsewhere. In such cases, we can safely ignore the error.
    }

    recipe.mixProperties =
      isRecipeEmpty(recipe) || !wasmBridge
        ? new MixProperties()
        : wasmBridge.calculate_recipe_mix_properties(makeLightRecipe(recipe, validIngredients));
  };

  const updateRecipe = (rowUpdates: [number, IngredientRow][]) => {
    const newRecipe = { ...recipe, ingredientRows: [...recipe.ingredientRows] };

    let needsMixPropUpdate = false;

    for (const [index, updatedRow] of rowUpdates) {
      const currentRow = newRecipe.ingredientRows[index];
      newRecipe.ingredientRows[index] = updatedRow;

      needsMixPropUpdate = needsMixPropUpdate || requiresMixPropsUpdate(currentRow, updatedRow);
    }

    newRecipe.mixTotal = calculateMixTotal(newRecipe);

    if (needsMixPropUpdate) updateMixProperties(newRecipe);

    const recipes = recipeContext.recipes.map((r) =>
      r.index === currentRecipeIdx ? newRecipe : r,
    );
    setRecipeContext({ ...recipeContext, recipes });
  };

  const makeRowUpdate = (
    index: number,
    _name: string | undefined,
    quantityStr: string | undefined,
  ): [number, IngredientRow] => {
    const row = { ...recipe.ingredientRows[index] };
    row.name = _name === undefined ? row.name : _name;

    row.quantity =
      quantityStr === undefined
        ? row.quantity
        : quantityStr === ""
          ? undefined
          : parseFloat(quantityStr);

    const isValidIng = row.name !== "" && validIngredients.includes(row.name);
    const needsIngUpdate = !isValidIng || !row.ingredient || row.ingredient.name !== row.name;

    if (needsIngUpdate) {
      if (row.ingredient) row.ingredient.free();
      row.ingredient = isValidIng ? wasmBridge.get_ingredient_by_name(row.name) : undefined;
    }

    return [index, row];
  };

  const updateIngredientRowName = (index: number, name: string) => {
    updateRecipe([makeRowUpdate(index, name, undefined)]);
  };

  const updateIngredientRowQuantity = (index: number, quantityStr: string) => {
    updateRecipe([makeRowUpdate(index, undefined, quantityStr)]);
  };

  const copyRecipe = async () => {
    const formattedRecipe = recipe.ingredientRows
      .filter((row) => row.name !== "" || row.quantity !== undefined)
      .map((row) => `${row.name}\t${row.quantity ?? ""}`)
      .join("\n");

    if (formattedRecipe) {
      await navigator.clipboard.writeText(`Ingredient\tQty(g)\n${formattedRecipe}`);
    }
  };

  const pasteRecipe = async () => {
    try {
      const lines = (await navigator.clipboard.readText()).trim().split("\n");
      const lineOffset = lines[0]?.includes("Ingredient") ? 1 : 0;

      if (lines.length - lineOffset > recipe.ingredientRows.length) {
        console.error("Pasted recipe has more rows than available in the recipe grid.");
        return;
      }

      const rowUpdates: [number, IngredientRow][] = [];

      for (const row of recipe.ingredientRows) {
        const line = lines[row.index + lineOffset]?.trim();
        if (!line) {
          rowUpdates.push(makeRowUpdate(row.index, "", ""));
          continue;
        }

        const parts = line.split("\t");
        const name = parts[0]?.trim() || "";
        const quantityStr = parts[1]?.trim() || "";

        rowUpdates.push(makeRowUpdate(row.index, name, quantityStr));
      }

      updateRecipe(rowUpdates);
    } catch (err) {
      console.error("Failed to paste recipe:", err);
    }
  };

  const clearRecipe = () => {
    updateRecipe(recipe.ingredientRows.map((row) => makeRowUpdate(row.index, "", "")));
  };

  // Prevents stale ingredient context if a row is changed (e.g. a recipe is pasted) before we have
  // had a chance to fetch all valid ingredients and populate validIngredients and the wasmBridge.
  useEffect(() => {
    updateRecipe(
      recipe.ingredientRows.map((row) =>
        makeRowUpdate(row.index, row.name, row.quantity?.toString()),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validIngredients.length]);

  const mixTotal = recipe.mixTotal;

  return (
    <div id="recipe-grid" className="grid-component" style={{ height: `${STD_COMPONENT_H_PX}px` }}>
      <div>
        {/* Recipe Selector */}
        <select
          value={currentRecipeIdx}
          onChange={(e) => setCurrentRecipeIdx(parseInt(e.target.value))}
          className="select-input w-53.5 text-center"
          style={{ backgroundColor: recipeCompBgColor(currentRecipeIdx) }}
        >
          {indices.map((idx) => (
            <option key={idx} value={idx} style={{ backgroundColor: recipeCompBgColor(idx) }}>
              {recipes[idx].name}
            </option>
          ))}
        </select>
        {/* Action Buttons */}
        <div className="float-right">
          {[
            { label: "Copy", action: copyRecipe },
            { label: "Paste", action: pasteRecipe },
            { label: "Clear", action: clearRecipe },
          ].map(({ label, action }) => (
            <button key={label} onClick={action} className="button ml-2 px-1">
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
      <table className="component-inner-border w-full">
        {/* Header */}
        <thead>
          <tr className="h-6.25 text-center">
            <th className="table-header min-w-62.5">Ingredient</th>
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
          {recipe.ingredientRows.map((row) => (
            <tr key={row.index} className="h-6.25">
              {/* Ingredient Name Input */}
              <td className="table-inner-cell">
                <input
                  type="search"
                  value={row.name}
                  onChange={(e) => updateIngredientRowName(row.index, e.target.value)}
                  className={`table-fillable-input ${
                    row.name === "" || validIngredients.includes(row.name)
                      ? "focus:ring-blue-400"
                      : "-outline-offset-2 outline-red-400 outline-solid focus:ring-red-400"
                  } px-2`}
                  placeholder=""
                  list="valid-ingredients"
                />
              </td>
              {/* Ingredient Quantity Input */}
              <td className="table-inner-cell">
                <input
                  type="number"
                  value={row.quantity?.toString() || ""}
                  onChange={(e) => updateIngredientRowQuantity(row.index, e.target.value)}
                  placeholder=""
                  step={standardInputStepByPercent(row.quantity, 2.5, 10)}
                  min={0}
                  className="table-fillable-input text-right font-mono"
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
