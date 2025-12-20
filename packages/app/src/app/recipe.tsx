"use client";

import { useEffect } from "react";

import { fetchIngredientSpec, IngredientTransfer } from "../lib/data";
import { formatCompositionValue } from "../lib/ui/comp-values";
import { STATE_VAL, standardInputStepByPercent } from "../lib/util";

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
  name: string;
  quantity: number | undefined;
  ingredient: Ingredient | undefined;
}

export type IngredientRowState = [
  IngredientRow,
  React.Dispatch<React.SetStateAction<IngredientRow>>
];

export type RecipeState = Array<IngredientRowState>;

export interface RecipeGridProps {
  recipeState: RecipeState;
  validIngredients: string[];
  ingredientCacheState: [
    Map<string, IngredientTransfer>,
    React.Dispatch<React.SetStateAction<Map<string, IngredientTransfer>>>
  ];
}

export function makeEmptyIngredientRow(): IngredientRow {
  return { name: "", quantity: undefined, ingredient: undefined };
}

export function getMixTotal(recipeState: RecipeState) {
  return recipeState.reduce(
    (sum: number | undefined, [row, _]) =>
      sum === undefined && row.quantity == undefined ? undefined : (sum || 0) + (row.quantity || 0),
    undefined
  );
}

export function getCompositionLines(recipeState: RecipeState): CompositionLine[] {
  return recipeState
    .filter(([row, _]) => {
      return row.ingredient !== undefined && row.quantity !== undefined;
    })
    .map(([row, _]) => {
      return new CompositionLine(row.ingredient!.composition!, row.quantity!);
    });
}

export function calculateMixComposition(recipeState: RecipeState): Composition {
  return calculate_mix_composition_js(getCompositionLines(recipeState));
}

export function calculateMixProperties(recipeState: RecipeState): MixProperties {
  return calculate_mix_properties_js(getCompositionLines(recipeState));
}

export function RecipeGrid({
  props: { recipeState, validIngredients, ingredientCacheState },
}: {
  props: RecipeGridProps;
}) {
  const [ingredientCache, setIngredientCache] = ingredientCacheState;

  const cachedFetchIngredientSpec = async (
    name: string
  ): Promise<IngredientTransfer | undefined> => {
    if (!ingredientCache.has(name)) {
      await fetchIngredientSpec(name).then((spec) => {
        if (spec) {
          ingredientCache.set(name, spec);
          setIngredientCache(ingredientCache);
        }
      });
    }
    return ingredientCache.get(name);
  };

  recipeState.forEach((rowState, _) => {
    const [row, setRow] = rowState;

    useEffect(() => {
      if (row.name !== "" && validIngredients.includes(row.name)) {
        cachedFetchIngredientSpec(row.name)
          .then((spec) => (spec ? into_ingredient_from_spec_js(spec.spec) : undefined))
          .then((ing) => setRow({ ...row, ingredient: ing }));
      } else {
        setRow({ ...row, ingredient: undefined });
      }
    }, [row.name, validIngredients]);
  });

  const updateIngredientRow = (
    index: number,
    _name: string | undefined,
    quantityStr: string | undefined
  ) => {
    const [row, setRow] = recipeState[index];

    const name = _name === undefined ? row.name : _name;
    const quantity =
      quantityStr === undefined
        ? row.quantity
        : quantityStr === ""
        ? undefined
        : parseFloat(quantityStr);

    setRow({ ...row, name, quantity });
  };

  const updateIngredientRowName = (index: number, name: string) => {
    updateIngredientRow(index, name, undefined);
  };

  const updateIngredientRowQuantity = (index: number, quantityStr: string) => {
    updateIngredientRow(index, undefined, quantityStr);
  };

  const copyRecipe = async () => {
    const recipeData = recipeState
      .map(([row, _]) => row)
      .filter((row) => row.name !== "" || row.quantity !== undefined)
      .map((row) => `${row.name}\t${row.quantity ?? ""}`)
      .join("\n");

    if (recipeData) {
      await navigator.clipboard.writeText(`Ingredient\tQty(g)\n${recipeData}`);
    }
  };

  const pasteRecipe = async () => {
    try {
      const lines = (await navigator.clipboard.readText()).trim().split("\n");
      const lineOffset = lines[0]?.includes("Ingredient") ? 1 : 0;

      if (lines.length - lineOffset > recipeState.length) {
        console.error("Pasted recipe has more rows than available in the recipe grid.");
        return;
      }

      for (let idx = 0; idx < recipeState.length; idx++) {
        const line = lines[idx + lineOffset]?.trim();
        if (!line) {
          updateIngredientRow(idx, "", "");
          continue;
        }

        const parts = line.split("\t");
        const name = parts[0]?.trim() || "";
        const quantityStr = parts[1]?.trim() || "";

        updateIngredientRow(idx, name, quantityStr);
      }
    } catch (err) {
      console.error("Failed to paste recipe:", err);
    }
  };

  const mixTotal = getMixTotal(recipeState);

  return (
    <div id="recipe-grid" className="grid-component">
      <div>
        <button onClick={copyRecipe} className="button px-1">
          Copy Recipe
        </button>
        <button onClick={pasteRecipe} className="button ml-2 px-1">
          Paste Recipe
        </button>
      </div>
      <datalist id="valid-ingredients">
        {validIngredients.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <table className="border-collapse border-gray-400 border-2">
        {/* Header */}
        <thead>
          <tr className="table-header border-1 h-[25px] text-center">
            <th className="border-gray-400 border-r w-[325px] min-w-[250px]">Ingredient</th>
            <th className="border-gray-400 border-r w-[60px] min-w-[60px]">Qty (g)</th>
            <th className="w-[55px] min-w-[55px] pl-2 pr-1 whitespace-nowrap">Qty (%)</th>
          </tr>
          {/* Total Row */}
          <tr className="table-header border-1 h-[25px]">
            <td className="px-1 border-gray-400 border-r text-center">Total</td>
            <td className="px-3.75 border-gray-400 border-r comp-val">
              {mixTotal ? mixTotal.toFixed(0) : ""}
            </td>
            <td className="px-1 comp-val">{mixTotal ? "100   " : ""}</td>
          </tr>
        </thead>
        <tbody>
          {/* Ingredient Rows */}
          {/* @todo The ingredient/input rows are not respecting < h-6/[25px]; not sure why yet */}
          {recipeState.map(([row, _], index) => (
            <tr
              key={index}
              className="table-inner-cell h-[25px] hover:bg-blue-50 transition-colors"
            >
              <td className="border-gray-300 border-r">
                <input
                  type="search"
                  value={row.name}
                  onChange={(e) => updateIngredientRowName(index, e.target.value)}
                  className={`table-fillable-input ${
                    row.name === "" || validIngredients.includes(row.name)
                      ? "focus:ring-blue-400"
                      : "focus:ring-red-400 outline-solid outline-red-400"
                  } px-2`}
                  placeholder=""
                  list="valid-ingredients"
                />
              </td>
              <td className="border-gray-300 border-r">
                <input
                  type="number"
                  value={row.quantity?.toString() || ""}
                  onChange={(e) => updateIngredientRowQuantity(index, e.target.value)}
                  placeholder=""
                  step={standardInputStepByPercent(row.quantity, 2.5, 10)}
                  min={0}
                  className="table-fillable-input text-right font-mono"
                />
              </td>
              <td className="px-1 text-gray-900 text-sm comp-val">
                {recipeState[index][STATE_VAL].quantity && mixTotal
                  ? formatCompositionValue(
                      (recipeState[index][STATE_VAL].quantity / mixTotal) * 100
                    )
                  : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
