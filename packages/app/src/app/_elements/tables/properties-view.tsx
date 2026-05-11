"use client";

import { ReactNode, useState } from "react";

import { RecipeSummary, isRecipeEmpty } from "@/app/_components/recipe";
import {
  KeyFilter,
  KeyFilterSelect,
  getEnabledKeys,
} from "@/app/_elements/selects/key-filter-select";
import { QtyToggle, QtyToggleSelect } from "@/app/_elements/selects/qty-toggle-select";
import { PropertiesTable } from "@/app/_elements/tables/properties-table";
import { STATE_VAL } from "@/lib/util";

import {
  CompKey,
  FpdKey,
  PropKey,
  compToPropKey,
  fpdToPropKey,
  getPropKeys,
  getMixProperty,
  prop_key_as_med_str,
} from "@workspace/sci-cream";

/** Default set of property keys shown when the Custom key filter is first initialized */
export const DEFAULT_SELECTED_PROPERTIES: Set<PropKey> = new Set([
  compToPropKey(CompKey.MilkFat),
  compToPropKey(CompKey.EggFat),
  compToPropKey(CompKey.CocoaButter),
  compToPropKey(CompKey.NutFat),
  compToPropKey(CompKey.OtherFats),
  compToPropKey(CompKey.TotalFats),
  compToPropKey(CompKey.MSNF),
  compToPropKey(CompKey.EggSNF),
  compToPropKey(CompKey.CocoaSolids),
  compToPropKey(CompKey.NutSNF),
  compToPropKey(CompKey.TotalSNF),
  compToPropKey(CompKey.TotalSNFS),
  compToPropKey(CompKey.TotalSolids),
  compToPropKey(CompKey.Water),
  compToPropKey(CompKey.TotalSugars),
  compToPropKey(CompKey.TotalArtificial),
  compToPropKey(CompKey.PACtotal),
  compToPropKey(CompKey.AbsPAC),
  fpdToPropKey(FpdKey.FPD),
  fpdToPropKey(FpdKey.ServingTemp),
  fpdToPropKey(FpdKey.HardnessAt14C),
] as PropKey[]);

/**
 * Properties table with an attached toolbar (QtyToggle + KeyFilter) that owns its own toolbar
 * state. Renders all provided recipes as columns; the caller is responsible for slot filtering.
 *
 * `toolbarPrefix` is rendered inside the toolbar's flex row before the controls; used by the panel
 * wrapper to inject a drag handle without breaking the toolbar layout.
 */
export function PropertiesView({
  recipes,
  toolbarPrefix,
  defaultSelected = DEFAULT_SELECTED_PROPERTIES,
}: {
  recipes: RecipeSummary[];
  toolbarPrefix?: ReactNode;
  defaultSelected?: Set<PropKey>;
}) {
  const qtyToggleState = useState<QtyToggle>(QtyToggle.Percentage);
  const propsFilterState = useState<KeyFilter>(KeyFilter.Auto);
  const selectedPropsState = useState<Set<PropKey>>(defaultSelected);

  /**
   * Returns `true` when the given property key has a zero/NaN value across all provided recipes.
   *
   * Treats all keys as empty when every recipe is itself empty, which avoids showing non-zero
   * default values (e.g. `PropKey.Water`) for an otherwise blank set of recipes.
   */
  const isPropEmpty = (propKey: PropKey) => {
    if (recipes.every((recipe) => isRecipeEmpty(recipe))) {
      return true;
    }

    for (const recipe of recipes) {
      const propVal = getMixProperty(recipe.mixProperties, propKey);
      if (!(propVal === 0 || Number.isNaN(propVal))) {
        return false;
      }
    }
    return true;
  };

  /** Auto-filter heuristic: includes a property key when it is part of the default selection */
  const autoHeuristic = (propKey: PropKey) => defaultSelected.has(propKey);

  /** Returns the list of property keys to display, based on the current filter and selection */
  const getEnabledProps = () => {
    return getEnabledKeys(
      propsFilterState[STATE_VAL],
      selectedPropsState[STATE_VAL],
      getPropKeys,
      isPropEmpty,
      autoHeuristic,
    );
  };

  return (
    <>
      <div className="flex items-center">
        {toolbarPrefix}
        <QtyToggleSelect
          supportedQtyToggles={[QtyToggle.Quantity, QtyToggle.Percentage]}
          qtyToggleState={qtyToggleState}
        />
        <KeyFilterSelect
          keyFilterState={propsFilterState}
          selectedKeysState={selectedPropsState}
          getKeys={getPropKeys}
          key_as_med_str={prop_key_as_med_str}
        />
      </div>
      <div className="h-[calc(100%-33px)] min-w-55 overflow-y-auto whitespace-nowrap">
        <PropertiesTable
          recipes={recipes}
          propKeys={getEnabledProps()}
          qtyToggle={qtyToggleState[STATE_VAL]}
        />
      </div>
    </>
  );
}
