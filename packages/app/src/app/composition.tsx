"use client";

import { useState } from "react";

import { IngredientRow, Recipe, isRecipeEmpty, getRecipeIndices } from "./recipe";
import { KeyFilter, QtyToggle, KeySelection, getEnabledKeys } from "../lib/ui/key-selection";
import { RecipeSelection } from "@/lib/ui/recipe-selection";
import { applyQtyToggleAndFormat } from "../lib/ui/comp-values";
import { isCompKeyQuantity } from "../lib/sci-cream/sci-cream";
import { STD_COMPONENT_H_PX } from "./page";
import { STATE_VAL } from "../lib/util";

import { CompKey, comp_key_as_med_str, getWasmEnums } from "@workspace/sci-cream";

function getCompKeys(): CompKey[] {
  return getWasmEnums(CompKey).filter(
    (key) =>
      // These values aren't very meaningful in a per-ingredient breakdown
      key !== CompKey.AbsPAC &&
      key !== CompKey.EmulsifiersPerFat &&
      key !== CompKey.StabilizersPerWater,
  );
}

const DEFAULT_SELECTED_COMPS: Set<CompKey> = new Set([
  CompKey.MilkFat,
  CompKey.TotalFats,
  CompKey.MSNF,
  CompKey.TotalSugars,
  CompKey.TotalSolids,
]);

export function IngredientCompositionGrid({ recipes: allRecipes }: { recipes: Recipe[] }) {
  const qtyToggleState = useState<QtyToggle>(QtyToggle.Quantity);
  const compsFilterState = useState<KeyFilter>(KeyFilter.Auto);
  const selectedCompsState = useState<Set<CompKey>>(DEFAULT_SELECTED_COMPS);
  const [currentRecipeIdx, setCurrentRecipeIdx] = useState<number>(0);

  const isPropEmpty = (comp_key: CompKey) => {
    return recipe.ingredientRows.every((row) => {
      return row.ingredient === undefined || row.ingredient.composition?.get(comp_key) === 0.0;
    });
  };

  const autoHeuristic = (comp_key: CompKey) => {
    return isPropEmpty(comp_key) === false;
  };

  const getEnabledComps = () => {
    return getEnabledKeys(
      compsFilterState,
      selectedCompsState,
      getCompKeys,
      isPropEmpty,
      autoHeuristic,
    );
  };

  const formattedTotalCell = (comp_key: CompKey) => {
    return applyQtyToggleAndFormat(
      recipe.mixProperties.composition.get(comp_key),
      recipe.mixTotal,
      recipe.mixTotal,
      qtyToggleState[STATE_VAL],
      isCompKeyQuantity(comp_key),
    );
  };

  const formattedCompCell = (row: IngredientRow, comp_key: CompKey) => {
    return row.ingredient && row.ingredient.composition
      ? applyQtyToggleAndFormat(
          row.ingredient.composition.get(comp_key),
          row.quantity,
          recipe.mixTotal,
          qtyToggleState[STATE_VAL],
          isCompKeyQuantity(comp_key),
        )
      : "";
  };

  // Only display the main recipe, non-empty reference recipes, or selected recipe
  const recipes = allRecipes.filter(
    (recipe) => recipe.index == 0 || !isRecipeEmpty(recipe) || recipe.index == currentRecipeIdx,
  );

  const recipe = allRecipes[currentRecipeIdx];

  return (
    <div
      id="ing-composition-grid"
      className="grid-component w-full min-w-50"
      style={{ height: `${STD_COMPONENT_H_PX}px` }}
    >
      {(recipes.length > 1 || currentRecipeIdx !== 0) && (
        <RecipeSelection
          allRecipes={allRecipes}
          enabledRecipeIndices={getRecipeIndices(recipes)}
          currentRecipeIdxState={[currentRecipeIdx, setCurrentRecipeIdx]}
        />
      )}
      <KeySelection
        qtyToggleComponent={{
          supportedQtyToggles: [QtyToggle.Composition, QtyToggle.Quantity, QtyToggle.Percentage],
          qtyToggleState: qtyToggleState,
        }}
        keyFilterState={compsFilterState}
        selectedKeysState={selectedCompsState}
        getKeys={getCompKeys}
        key_as_med_str={comp_key_as_med_str}
      />
      <div>
        {/* @todo The table doesn't fully align to the right, and its parent's div is ~2px too tall */}
        <div className="component-inner-border overflow-x-auto whitespace-nowrap">
          <table className="relative -top-px -left-px">
            {/* Header */}
            <thead>
              {/* Composition Header */}
              <tr className="h-6.25">
                {getEnabledComps().map((comp_key) => (
                  <th key={comp_key} className="table-header w-fit px-1 text-center">
                    {comp_key_as_med_str(comp_key)}
                  </th>
                ))}
              </tr>
              {/* Totals Row */}
              <tr className="h-6.25">
                {getEnabledComps().map((comp_key) => (
                  <td key={comp_key} className="table-header comp-val px-1">
                    {formattedTotalCell(comp_key)}
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Composition Rows */}
              {recipe.ingredientRows.map((row) => (
                <tr key={row.index} className="h-6.25">
                  {getEnabledComps().map((comp_key) => (
                    <td key={comp_key} className="table-inner-cell comp-val px-1">
                      {formattedCompCell(row, comp_key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
