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
 * Renders one horizontally-scrollable table: pinned (sticky-left) Ingredient and Qty columns, then
 * a composition-per-ingredient column for each comp key, with a totals row beneath the header. The
 * caller owns the qty-toggle and comp-key selection; the breakdown just renders what it's told.
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

  // Freeze both axes: `.table-sticky-head` sticks the `<thead>` (header + totals as one layer) and
  // the pin classes stick Ingredient/Qty left. The Ingredient column is `w-48` (192px) plus its two
  // 1px side borders, so Qty pins at 194px to stay flush.
  const ingPinHead = "table-pin-head left-0";
  const qtyPinHead = "table-pin-head left-[194px]";
  const ingPinCell = "table-pin-cell left-0";
  const qtyPinCell = "table-pin-cell left-[194px]";

  return (
    <div
      id="composition-breakdown-table"
      className="min-h-0 flex-1 overflow-auto whitespace-nowrap"
    >
      <table className="border-separate border-spacing-0">
        <thead className="table-sticky-head">
          {/* Ingredient, Qty, and CompKey headers */}
          <tr className="h-6.5">
            <th className={`table-col-header ${ingPinHead}`}>
              <div className="w-48 truncate px-2 text-center">Ingredient</div>
            </th>
            <th className={`table-col-header ${qtyPinHead} px-3`}>
              {`Qty (${qtyToggle == QtyToggle.Percentage ? "%" : "g"})`}
            </th>
            {compKeys.map((compKey) => (
              <th
                key={compKey}
                data-comp-key={String(compKey)}
                className="table-col-header px-1 text-center"
              >
                {comp_key_as_med_str(compKey)}
              </th>
            ))}
          </tr>
          {/* Totals row */}
          <tr className="h-6.25">
            <td className={`table-total ${ingPinHead} px-1.25 text-center`}>Total</td>
            <td className={`table-total comp-val ${qtyPinHead} px-1.25`}>
              {qtyToggle === QtyToggle.Percentage
                ? "100   "
                : recipe.mixTotal
                  ? recipe.mixTotal.toFixed(0)
                  : ""}
            </td>
            {compKeys.map((compKey) => (
              <td
                key={compKey}
                data-comp-key={String(compKey)}
                className="table-total comp-val px-1"
              >
                {formattedTotalCell(compKey)}
              </td>
            ))}
          </tr>
        </thead>
        {/* Ingredients, quantities, and composition values */}
        <tbody>
          {recipe.ingredientRows.map((row) => (
            <tr key={row.index} className="h-6.25">
              <td className={`table-inner-cell ${ingPinCell} p-0`}>
                <div className="w-48 truncate px-2" title={row.name}>
                  {row.name}
                </div>
              </td>
              <td className={`table-inner-cell comp-val ${qtyPinCell} px-2`}>
                {row.quantity && recipe.mixTotal
                  ? qtyToggle === QtyToggle.Percentage
                    ? formatCompositionValue((row.quantity / recipe.mixTotal) * 100)
                    : row.quantity
                  : ""}
              </td>
              {compKeys.map((compKey) => (
                <td
                  key={compKey}
                  data-comp-key={String(compKey)}
                  className="table-inner-cell comp-val px-1"
                >
                  {formattedCompCell(row, compKey)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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
  const [qtyToggle, setQtyToggle, supportedQtyToggles] = useQtyToggleState(persistKey, {
    supportedQtyToggles: [QtyToggle.Composition, QtyToggle.Quantity, QtyToggle.Percentage],
    defaultValue: QtyToggle.Quantity,
  });

  const { keyFilterState: compsFilterState, selectedKeysState: selectedCompsState } =
    useKeyFilterState(persistKey, { defaultSelected, getKeys: getCompKeys });

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
    <div className="flex h-full flex-col">
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
          supportedQtyToggles={supportedQtyToggles}
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
    </div>
  );
}
