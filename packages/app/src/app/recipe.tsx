"use client";

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

export interface RecipesData {
  validIngredients: string[];
  ingredientCache: Map<string, IngredientTransfer>;
  recipes: Recipe[];
}

export type RecipesDataState = [RecipesData, React.Dispatch<React.SetStateAction<RecipesData>>];

export function makeEmptyRecipesData(): RecipesData {
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
  recipesDataState: [recipesData, setRecipesData],
  index,
}: {
  recipesDataState: RecipesDataState;
  index: number;
}) {
  const { validIngredients, ingredientCache, recipes } = recipesData;
  const recipe = recipes[index];

  const cachedFetchIngredientSpec = async (
    name: string,
  ): Promise<IngredientTransfer | undefined> => {
    if (!ingredientCache.has(name)) {
      await fetchIngredientSpec(name).then((spec) => {
        if (spec) {
          ingredientCache.set(name, spec);
          setRecipesData({ ...recipesData, ingredientCache });
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

    const recipes = recipesData.recipes.map((r) => (r.index === index ? newRecipe : r));
    setRecipesData({ ...recipesData, recipes });
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

    if (row.name !== "" && validIngredients.includes(row.name)) {
      cachedFetchIngredientSpec(row.name)
        .then((spec) => (spec ? into_ingredient_from_spec_js(spec.spec) : undefined))
        .then((ing) => {
          row.ingredient = ing;
        })
        .finally(() => {
          updateRecipe(row);
        });
    } else {
      row.ingredient = undefined;
      updateRecipe(row);
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

  const mixTotal = recipe.mixTotal;

  return (
    <div id="recipe-grid" className="grid-component std-component-h">
      <div>
        <button onClick={copyRecipe} className="button px-1">
          Copy
        </button>
        <button onClick={pasteRecipe} className="button ml-2 px-1">
          Paste
        </button>
        <button onClick={clearRecipe} className="button ml-2 px-1">
          Clear
        </button>
      </div>
      <datalist id="valid-ingredients">
        {validIngredients.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <table className="component-inner-border">
        {/* Header */}
        <thead>
          <tr className="h-6.25 text-center">
            <th className="table-header w-81.25 min-w-62.5">Ingredient</th>
            <th className="table-header w-15 min-w-15">Qty (g)</th>
            <th className="table-header w-13.75 min-w-13.75 pr-1 pl-2 whitespace-nowrap">
              Qty (%)
            </th>
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
                      : "outline-red-400 outline-solid focus:ring-red-400"
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
