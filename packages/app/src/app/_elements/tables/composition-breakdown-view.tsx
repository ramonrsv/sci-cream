"use client";

import { ReactNode, useState } from "react";

import { Recipe, isRecipeEmpty, getRecipeIndices } from "@/app/_components/recipe";
import {
  KeyFilter,
  KeyFilterSelect,
  getEnabledKeys,
} from "@/app/_elements/selects/key-filter-select";
import { QtyToggle, QtyToggleSelect } from "@/app/_elements/selects/qty-toggle-select";
import { RecipeSelect } from "@/app/_elements/selects/recipe-select";
import { CompositionBreakdown, getCompKeys } from "@/app/_elements/tables/composition-breakdown";
import { STATE_VAL } from "@/lib/util";

import { CompKey, comp_key_as_med_str } from "@workspace/sci-cream";

/** Default set of composition keys shown when the Custom key filter is first initialized */
const DEFAULT_SELECTED_COMPS: Set<CompKey> = new Set([
  CompKey.MilkFat,
  CompKey.TotalFats,
  CompKey.MSNF,
  CompKey.TotalSugars,
  CompKey.TotalSolids,
]);

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
}: {
  recipes: Recipe[];
  toolbarPrefix?: ReactNode;
  defaultSelected?: Set<CompKey>;
}) {
  const [qtyToggle, setQtyToggle] = useState<QtyToggle>(QtyToggle.Quantity);
  const compsFilterState = useState<KeyFilter>(KeyFilter.Auto);
  const selectedCompsState = useState<Set<CompKey>>(defaultSelected);
  const [currentRecipeIdx, setCurrentRecipeIdx] = useState<number>(0);

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
      <div className="flex items-center">
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
        />
      </div>
      <CompositionBreakdown recipe={recipe} compKeys={getEnabledComps()} qtyToggle={qtyToggle} />
    </>
  );
}
