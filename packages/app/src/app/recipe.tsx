"use client";

import { useState, useEffect } from "react";

import { fetchIngredientSpec, IngredientTransfer } from "../lib/data";
import { formatCompositionValue } from "../lib/ui/comp-values";
import { standardInputStepByPercent } from "../lib/util";
import { MAX_RECIPES, RECIPE_TOTAL_ROWS } from "./page";

import {
  Ingredient,
  into_ingredient_from_spec_js,
  Composition,
  CompositionLine,
  MixProperties,
  calculate_mix_composition_js,
  calculate_mix_properties_js,
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
  validIngredients: string[];
  ingredientCache: Map<string, IngredientTransfer>;
  recipes: Recipe[];
}

export type RecipeContextState = [
  RecipeContext,
  React.Dispatch<React.SetStateAction<RecipeContext>>,
];

export function makeEmptyRecipeContext(): RecipeContext {
  return {
    validIngredients: [],
    ingredientCache: new Map<string, IngredientTransfer>(),
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

export function getCompositionLines(recipe: Recipe): CompositionLine[] {
  return recipe.ingredientRows
    .filter((row) => {
      return row.ingredient !== undefined && row.quantity !== undefined;
    })
    .map((row) => {
      return new CompositionLine(row.ingredient!.composition!, row.quantity!);
    });
}

export function calculateMixComposition(recipe: Recipe): Composition {
  return calculate_mix_composition_js(getCompositionLines(recipe));
}

export function calculateMixProperties(recipe: Recipe): MixProperties {
  return calculate_mix_properties_js(getCompositionLines(recipe));
}

export function RecipeGrid({
  prop: {
    ctx: [recipeContext, setRecipeContext],
    indices,
  },
}: {
  prop: { ctx: RecipeContextState; indices: number[] };
}) {
  const { validIngredients, ingredientCache, recipes } = recipeContext;
  const [currentRecipeIdx, setCurrentRecipeIdx] = useState<number>(indices[0]);

  const recipe = recipes[currentRecipeIdx];

  const cachedFetchIngredientSpec = async (
    name: string,
  ): Promise<IngredientTransfer | undefined> => {
    if (!ingredientCache.has(name)) {
      await fetchIngredientSpec(name).then((spec) => {
        if (spec) {
          ingredientCache.set(name, spec);
          setRecipeContext({ ...recipeContext, ingredientCache });
        }
      });
    }
    return ingredientCache.get(name);
  };

  const updateRecipe = (row: IngredientRow) => {
    const newRecipe = { ...recipe };
    newRecipe.ingredientRows[row.index] = row;

    newRecipe.mixTotal = calculateMixTotal(newRecipe);
    newRecipe.mixProperties = isRecipeEmpty(newRecipe)
      ? new MixProperties()
      : calculateMixProperties(newRecipe);

    const recipes = recipeContext.recipes.map((r) =>
      r.index === currentRecipeIdx ? newRecipe : r,
    );
    setRecipeContext({ ...recipeContext, recipes });
  };

  const updateIngredientRow = (
    index: number,
    _name: string | undefined,
    quantityStr: string | undefined,
  ) => {
    const row = { ...recipe.ingredientRows[index] };
    row.name = _name === undefined ? row.name : _name;

    row.quantity =
      quantityStr === undefined
        ? row.quantity
        : quantityStr === ""
          ? undefined
          : parseFloat(quantityStr);

    const isValidIngredient = row.name !== "" && validIngredients.includes(row.name);
    updateRecipe({ ...row, ingredient: isValidIngredient ? row.ingredient : undefined });

    if (isValidIngredient && (row.ingredient === undefined || row.ingredient.name !== row.name)) {
      cachedFetchIngredientSpec(row.name)
        .then((spec) => (spec ? into_ingredient_from_spec_js(spec.spec) : undefined))
        .then((ingredient) => {
          updateRecipe({ ...row, ingredient });
        });
    }
  };

  const updateIngredientRowName = (index: number, name: string) => {
    updateIngredientRow(index, name, undefined);
  };

  const updateIngredientRowQuantity = (index: number, quantityStr: string) => {
    updateIngredientRow(index, undefined, quantityStr);
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

      for (const row of recipe.ingredientRows) {
        const line = lines[row.index + lineOffset]?.trim();
        if (!line) {
          updateIngredientRow(row.index, "", "");
          continue;
        }

        const parts = line.split("\t");
        const name = parts[0]?.trim() || "";
        const quantityStr = parts[1]?.trim() || "";

        updateIngredientRow(row.index, name, quantityStr);
      }
    } catch (err) {
      console.error("Failed to paste recipe:", err);
    }
  };

  const clearRecipe = () => {
    for (const row of recipe.ingredientRows) {
      updateIngredientRow(row.index, "", "");
    }
  };

  // Prevent stale ingredient rows if pasted quickly whilst validIngredients/ingredientCache
  // are still loading during pre-fetch. @todo For some reason this results in 80 calls to
  // updateIngredientRow when the component is first mounted, works normally after that.
  // Looks like each recipe being rendered gets refreshed twice on mount; need to investigate.
  useEffect(() => {
    recipe.ingredientRows.forEach((row) => {
      updateIngredientRow(row.index, row.name, row.quantity?.toString());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validIngredients.length, ingredientCache.size]);

  const mixTotal = recipe.mixTotal;

  return (
    <div id="recipe-grid" className="grid-component std-component-h">
      <div>
        {/* Recipe Selector */}
        <select
          value={currentRecipeIdx}
          onChange={(e) => setCurrentRecipeIdx(parseInt(e.target.value))}
          className="select-input w-20 text-center"
        >
          {indices.map((idx) => (
            <option key={idx} value={idx}>
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
