"use client";

import { ReactNode } from "react";

import { IngredientRow, Recipe, isRecipeEmpty, getRecipeIndices } from "@/lib/recipe";
import {
  KeyFilterSelect,
  getEnabledKeys,
  useKeyFilterState,
} from "@/app/_elements/selects/key-filter-select";
import {
  QtyToggle,
  QtyToggleSelect,
  useQtyToggleState,
} from "@/app/_elements/selects/qty-toggle-select";
import { RecipeSelect, useRecipeIdxState } from "@/app/_elements/selects/recipe-select";
import { useOrderKeys } from "@/lib/group-by";
import { applyQtyToggleAndFormat, formatCompositionValue } from "@/lib/comp-value-format";
import { groupEnabledCompKeys } from "@/lib/sci-cream/sci-cream";
import { STATE_VAL } from "@/lib/util";

import { CompKey, comp_key_as_med_str, getWasmEnums } from "@workspace/sci-cream";

/** Returns all `CompKey` values — every one is an additive quantity (ratios are `RatioKey`). */
export function getCompKeys(): CompKey[] {
  return getWasmEnums(CompKey);
}

/** Default set of composition keys shown when the Custom key filter is first initialized */
const DEFAULT_SELECTED_COMPS: Set<CompKey> = new Set([
  CompKey.MilkFat,
  CompKey.TotalFats,
  CompKey.MSNF,
  CompKey.TotalSugars,
  CompKey.TotalSolids,
]);

/**
 * Bare presentational breakdown of a recipe's composition.
 *
 * Renders two side-by-side tables: an ingredient/quantity table on the left and a
 * composition-per-ingredient matrix on the right, with a shared totals row at the top. The caller
 * owns the qty-toggle and comp-key selection; the breakdown just renders what it's told.
 */
export function CompositionBreakdown({
  recipe,
  compKeys,
  qtyToggle,
}: {
  recipe: Recipe;
  compKeys: CompKey[];
  qtyToggle: QtyToggle;
}) {
  /** Formats a totals-row cell value for the given comp key, applying the current qtyToggle */
  const formattedTotalCell = (compKey: CompKey) => {
    return applyQtyToggleAndFormat(
      recipe.mixProperties.composition.get(compKey),
      recipe.mixTotal,
      recipe.mixTotal,
      qtyToggle,
      true,
    );
  };

  /**
   * Formats a per-ingredient composition cell value, applying the current qtyToggle, or returns an
   * empty string if the row has no ingredient or no found composition data for that ingredient.
   */
  const formattedCompCell = (row: IngredientRow, compKey: CompKey) => {
    return row.ingredient && row.ingredient.composition
      ? applyQtyToggleAndFormat(
          row.ingredient.composition.get(compKey),
          row.quantity,
          recipe.mixTotal,
          qtyToggle,
          true,
        )
      : "";
  };

  return (
    <div className="border-brd-lt dark:border-brd-dk border-r">
      {/* Ingredient & Qty Table */}
      <div id="composition-breakdown-recipe-table">
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
      <div id="composition-breakdown-table" className="overflow-x-auto whitespace-nowrap">
        <table>
          <thead>
            <tr className="h-6.25">
              {compKeys.map((compKey) => (
                <th key={compKey} className="table-header w-fit px-1 text-center">
                  {comp_key_as_med_str(compKey)}
                </th>
              ))}
            </tr>
            <tr className="h-6.25">
              {compKeys.map((compKey) => (
                <td key={compKey} className="table-header comp-val px-1">
                  {formattedTotalCell(compKey)}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {recipe.ingredientRows.map((row) => (
              <tr key={row.index} className="h-6.25">
                {compKeys.map((compKey) => (
                  <td key={compKey} className="table-inner-cell comp-val px-1">
                    {formattedCompCell(row, compKey)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Composition breakdown with an attached toolbar (RecipeSelect, QtyToggle, KeyFilter) that owns
 * its own toolbar state and the currently displayed recipe slot.
 *
 * `RecipeSelect` is only rendered when there are at least two enabled recipes, or when the user
 * has switched away from the main recipe; recipe-search with a single recipe sees no select.
 *
 * `toolbarPrefix` is rendered inside the toolbar's flex row before the controls; used by the
 * panel wrapper to inject a drag handle without breaking the toolbar layout.
 */
export function CompositionBreakdownView({
  recipes: allRecipes,
  toolbarPrefix,
  defaultSelected = DEFAULT_SELECTED_COMPS,
  persistKey,
}: {
  recipes: Recipe[];
  toolbarPrefix?: ReactNode;
  defaultSelected?: Set<CompKey>;
  persistKey?: string;
}) {
  const [qtyToggle, setQtyToggle] = useQtyToggleState(persistKey, QtyToggle.Quantity);
  const { keyFilterState: compsFilterState, selectedKeysState: selectedCompsState } =
    useKeyFilterState<CompKey>(persistKey, { defaultSelected, getKeys: getCompKeys });
  const [currentRecipeIdx, setCurrentRecipeIdx] = useRecipeIdxState(persistKey);

  const orderKeys = useOrderKeys<CompKey>(groupEnabledCompKeys);

  /** Returns `true` if every ingredient row has a zero (or absent) value for the given comp key */
  const isPropEmpty = (compKey: CompKey) => {
    return recipe.ingredientRows.every((row) => {
      return row.ingredient === undefined || row.ingredient.composition?.get(compKey) === 0.0;
    });
  };

  /** Auto-filter heuristic: includes key if at least one ingredient has a non-zero value for it */
  const autoHeuristic = (compKey: CompKey) => isPropEmpty(compKey) === false;

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

  /** Recipes enabled in RecipeSelect: main + non-empty refs + the currently selected recipe */
  const enabledRecipes = allRecipes.filter(
    (recipe) => recipe.index == 0 || !isRecipeEmpty(recipe) || recipe.index == currentRecipeIdx,
  );

  const recipe = allRecipes[currentRecipeIdx];

  return (
    <>
      <div className="toolbar">
        {toolbarPrefix}
        {(enabledRecipes.length > 1 || currentRecipeIdx !== 0) && (
          <RecipeSelect
            allRecipes={allRecipes}
            enabledRecipeIndices={getRecipeIndices(enabledRecipes)}
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
          orderKeys={orderKeys}
        />
      </div>
      <CompositionBreakdown recipe={recipe} compKeys={getEnabledComps()} qtyToggle={qtyToggle} />
    </>
  );
}
