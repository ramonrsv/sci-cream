"use client";

import { ReactNode, useState } from "react";

import { RecipeSummary, isRecipeEmpty } from "@/lib/recipe";
import {
  KeyFilter,
  KeyFilterSelect,
  getEnabledKeys,
} from "@/app/_elements/selects/key-filter-select";
import { QtyToggle, QtyToggleSelect } from "@/app/_elements/selects/qty-toggle-select";
import { applyQtyToggleAndFormat } from "@/lib/comp-value-format";
import { isPropKeyQuantity, isPropKeyMixScope } from "@/lib/sci-cream/sci-cream";
import { STATE_VAL } from "@/lib/util";

import {
  CompKey,
  RatioKey,
  FpdKey,
  PropKey,
  compToPropKey,
  ratioToPropKey,
  fpdToPropKey,
  getPropKeys,
  getMixProperty,
  MixProperties,
  prop_key_as_med_str,
} from "@workspace/sci-cream";

/** Mix-scope property keys: all `getPropKeys`, minus ingredient-only ratio keys. */
function getMixScopePropKeys(): PropKey[] {
  return getPropKeys().filter(isPropKeyMixScope);
}

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
  compToPropKey(CompKey.TotalPAC),
  ratioToPropKey(RatioKey.AbsPAC),
  fpdToPropKey(FpdKey.FPD),
  fpdToPropKey(FpdKey.ServingTemp),
  fpdToPropKey(FpdKey.HardnessAt14C),
] as PropKey[]);

/**
 * Bare presentational table showing mix property values across one or more recipes.
 *
 * Columns are the provided recipes (header: `recipe.id`), rows are the provided `propKeys`. The
 * caller owns recipe/key filtering, toolbar state, and any scroll/size chrome.
 */
export function PropertiesTable({
  recipes,
  propKeys,
  qtyToggle,
}: {
  recipes: RecipeSummary[];
  propKeys: PropKey[];
  qtyToggle: QtyToggle;
}) {
  const formattedCell = (propKey: PropKey, mixProperties: MixProperties, mixTotal: number) => {
    return applyQtyToggleAndFormat(
      getMixProperty(mixProperties, propKey),
      mixTotal,
      mixTotal,
      qtyToggle,
      isPropKeyQuantity(propKey),
    );
  };

  return (
    <table>
      <thead>
        <tr className="h-6.25">
          <th className="table-header w-full px-1.25">Property</th>
          {recipes.map((recipe) => (
            <th key={recipe.id} className="table-header px-1.25 text-center">
              {recipe.id}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {propKeys.map((propKey) => (
          <tr key={String(propKey)} className="h-6.25">
            <td className="table-header w-full px-1.25 text-center">
              {prop_key_as_med_str(propKey)}
            </td>
            {recipes.map((recipe) => (
              <td key={recipe.id} className="table-inner-cell comp-val px-1.25">
                {formattedCell(propKey, recipe.mixProperties, recipe.mixTotal!)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

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
      getMixScopePropKeys,
      isPropEmpty,
      autoHeuristic,
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="toolbar">
        {toolbarPrefix}
        <QtyToggleSelect
          supportedQtyToggles={[QtyToggle.Quantity, QtyToggle.Percentage]}
          qtyToggleState={qtyToggleState}
        />
        <KeyFilterSelect
          keyFilterState={propsFilterState}
          selectedKeysState={selectedPropsState}
          getKeys={getMixScopePropKeys}
          key_as_med_str={prop_key_as_med_str}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto whitespace-nowrap">
        <PropertiesTable
          recipes={recipes}
          propKeys={getEnabledProps()}
          qtyToggle={qtyToggleState[STATE_VAL]}
        />
      </div>
    </div>
  );
}
