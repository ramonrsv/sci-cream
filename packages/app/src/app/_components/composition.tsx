"use client";

import { useState } from "react";
import { GripVertical } from "lucide-react";

import { IngredientRow, Recipe, isRecipeEmpty, getRecipeIndices } from "./recipe";
import { KeyFilter, KeyFilterSelect, getEnabledKeys } from "../_elements/selects/key-filter-select";
import { QtyToggle, QtyToggleSelect } from "../_elements/selects/qty-toggle-select";
import { RecipeSelect } from "@/app/_elements/selects/recipe-select";
import { applyQtyToggleAndFormat, formatCompositionValue } from "@/lib/comp-value-format";
import { isCompKeyQuantity } from "../../lib/sci-cream/sci-cream";
import { STD_COMPONENT_H_PX, DRAG_HANDLE_ICON_SIZE } from "../../lib/styles/sizes";
import { STATE_VAL } from "@/lib/util";

import { CompKey, comp_key_as_med_str, getWasmEnums } from "@workspace/sci-cream";

/** Returns all `CompKey` values that represent a measurable quantity (excludes ratio properties) */
export function getCompKeys(): CompKey[] {
  // Some values, e.g. ratio properties, aren't very meaningful in a per-ingredient breakdown
  return getWasmEnums(CompKey).filter((key) => isCompKeyQuantity(key));
}

/** Default set of composition keys shown when the Custom key filter is first initialized */
const DEFAULT_SELECTED_COMPS: Set<CompKey> = new Set([
  CompKey.MilkFat,
  CompKey.TotalFats,
  CompKey.MSNF,
  CompKey.TotalSugars,
  CompKey.TotalSolids,
]);

/** Grid component that displays a per-ingredient composition breakdown for a set of recipes */
export function IngredientCompositionGrid({ recipes: allRecipes }: { recipes: Recipe[] }) {
  const [qtyToggle, setQtyToggle] = useState<QtyToggle>(QtyToggle.Quantity);
  const compsFilterState = useState<KeyFilter>(KeyFilter.Auto);
  const selectedCompsState = useState<Set<CompKey>>(DEFAULT_SELECTED_COMPS);
  const [currentRecipeIdx, setCurrentRecipeIdx] = useState<number>(0);

  /** Returns `true` if every ingredient row has a zero (or absent) value for the given comp key */
  const isPropEmpty = (comp_key: CompKey) => {
    return recipe.ingredientRows.every((row) => {
      return row.ingredient === undefined || row.ingredient.composition?.get(comp_key) === 0.0;
    });
  };

  /** Auto-filter heuristic: includes key if at least one ingredient has a non-zero value for it */
  const autoHeuristic = (comp_key: CompKey) => {
    return isPropEmpty(comp_key) === false;
  };

  /** Returns the list of composition keys to display, based on the current filter and selection */
  const getEnabledComps = () => {
    return getEnabledKeys(
      compsFilterState[STATE_VAL],
      selectedCompsState[STATE_VAL],
      getCompKeys,
      isPropEmpty,
      autoHeuristic,
    );
  };

  /** Formats a totals-row cell value for the given comp key, applying the current qtyToggle */
  const formattedTotalCell = (comp_key: CompKey) => {
    return applyQtyToggleAndFormat(
      recipe.mixProperties.composition.get(comp_key),
      recipe.mixTotal,
      recipe.mixTotal,
      qtyToggle,
      isCompKeyQuantity(comp_key),
    );
  };

  /**
   * Formats a per-ingredient composition cell value, applying the current qtyToggle, or returns an
   * empty string if the row has no ingredient or no found composition data for that ingredient.
   */
  const formattedCompCell = (row: IngredientRow, comp_key: CompKey) => {
    return row.ingredient && row.ingredient.composition
      ? applyQtyToggleAndFormat(
          row.ingredient.composition.get(comp_key),
          row.quantity,
          recipe.mixTotal,
          qtyToggle,
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
      <div className="flex items-center">
        <GripVertical size={DRAG_HANDLE_ICON_SIZE} className="drag-handle" />
        {(recipes.length > 1 || currentRecipeIdx !== 0) && (
          <RecipeSelect
            allRecipes={allRecipes}
            enabledRecipeIndices={getRecipeIndices(recipes)}
            currentRecipeIdxState={[currentRecipeIdx, setCurrentRecipeIdx]}
          />
        )}
        <QtyToggleSelect
          supportedQtyToggles={[QtyToggle.Composition, QtyToggle.Quantity, QtyToggle.Percentage]}
          qtyToggleState={[qtyToggle, setQtyToggle]}
        />
        <KeyFilterSelect
          keyFilterState={compsFilterState}
          selectedKeysState={selectedCompsState}
          getKeys={getCompKeys}
          key_as_med_str={comp_key_as_med_str}
        />
      </div>
      <div className="border-brd-lt dark:border-brd-dk border-r">
        {/* Ingredient & Qty Table */}
        <div id="ing-quantity-table">
          <table className="float-left">
            <thead>
              <tr className="h-6.25">
                <th className="table-header w-fit px-1.25">Ingredient</th>
                <th className="table-header w-fit px-1.25">{`Qty (${qtyToggle == QtyToggle.Percentage ? "%" : "g"})`}</th>
              </tr>
              <tr className="h-6.25">
                <td className="table-header w-fit px-1.25 text-center">Total</td>
                <td className="table-header comp-val w-fit px-1.25">
                  {qtyToggle === QtyToggle.Percentage
                    ? "100   "
                    : recipe.mixTotal
                      ? recipe.mixTotal.toFixed(0)
                      : ""}
                </td>
              </tr>
            </thead>
            <tbody>
              {recipe.ingredientRows.map((row) => (
                <tr key={row.index} className="h-6.25">
                  <td className="table-inner-cell w-fit px-2">{row.name}</td>
                  <td className="table-inner-cell comp-val w-17 px-2">
                    {row.quantity && recipe.mixTotal
                      ? qtyToggle === QtyToggle.Percentage
                        ? formatCompositionValue((row.quantity / recipe.mixTotal) * 100)
                        : row.quantity
                      : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Composition Table */}
        {/* @todo The table doesn't fully align to the right, and its parent's div is ~2px too tall */}
        <div id="ing-composition-table" className="overflow-x-auto whitespace-nowrap">
          <table>
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
