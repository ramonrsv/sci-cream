"use client";

import { useState } from "react";

import { RecipeState, getMixTotal, calculateMixProperties } from "./recipe";
import { KeyFilter, QtyToggle, KeySelection, getEnabledKeys } from "../lib/ui/key-selection";
import { applyQtyToggleAndFormat } from "../lib/ui/comp-values";
import { RECIPE_TOTAL_ROWS } from "./page";
import { PropKey, getPropKeys, isPropKeyQuantity } from "../lib/sci-cream/sci-cream";
import { STATE_VAL } from "../lib/util";

import {
  CompKey,
  FpdKey,
  getMixProperty,
  MixProperties,
  prop_key_as_med_str_js,
} from "@workspace/sci-cream";

export const DEFAULT_SELECTED_PROPERTIES: Set<PropKey> = new Set([
  CompKey[CompKey.MilkFat],
  CompKey[CompKey.TotalFat],
  CompKey[CompKey.MSNF],
  CompKey[CompKey.Sugars],
  CompKey[CompKey.TotalSolids],
  CompKey[CompKey.PACtotal],
  CompKey[CompKey.AbsPAC],
  FpdKey[FpdKey.FPD],
  FpdKey[FpdKey.ServingTemp],
  FpdKey[FpdKey.HardnessAt14C],
]);

export function MixPropertiesGrid({ recipeStates }: { recipeStates: RecipeState[] }) {
  const qtyToggleState = useState<QtyToggle>(QtyToggle.Percentage);
  const propsFilterState = useState<KeyFilter>(KeyFilter.Auto);
  const selectedPropsState = useState<Set<PropKey>>(DEFAULT_SELECTED_PROPERTIES);

  const isPropEmpty = (prop_key: PropKey) => {
    // All PropKeys are considered to be empty if all recipes are empty
    // This handles values that are not zero for empty recipes, e.g. Water
    // prettier-ignore
    if (nonEmptyRecipes.every(({ mixTotal }) => { return mixTotal === 0; })) {
      return true;
    }

    for (const { mixProperties } of nonEmptyRecipes) {
      const prop_val = getMixProperty(mixProperties, prop_key);
      if (!(prop_val === 0 || Number.isNaN(prop_val))) {
        return false;
      }
    }
    return true;
  };

  const getEnabledProps = () => {
    return getEnabledKeys(propsFilterState, selectedPropsState, getPropKeys, isPropEmpty);
  };

  const formattedPropCell = (prop_key: PropKey, mixProperties: MixProperties, mixTotal: number) => {
    return applyQtyToggleAndFormat(
      getMixProperty(mixProperties, prop_key),
      mixTotal,
      mixTotal,
      qtyToggleState[STATE_VAL],
      isPropKeyQuantity(prop_key)
    );
  };

  const nonEmptyRecipes = recipeStates
    .map((recipeState, index) => {
      return {
        recipeIdx: index,
        mixTotal: getMixTotal(recipeState) || 0,
        mixProperties: calculateMixProperties(recipeState),
      };
    })
    .filter(({ recipeIdx, mixTotal }) => recipeIdx == 0 || mixTotal > 0);

  return (
    <div id="mix-properties-grid" className="w-full h-full bg-gray-100">
      <KeySelection
        qtyToggleComponent={{
          supportedQtyToggles: [QtyToggle.Quantity, QtyToggle.Percentage],
          qtyToggleState: qtyToggleState,
        }}
        keyFilterState={propsFilterState}
        selectedKeysState={selectedPropsState}
        getKeys={getPropKeys}
        key_as_med_str_js={prop_key_as_med_str_js}
      />
      <div className="min-w-55 h-[calc(100%-36px)] overflow-y-auto whitespace-nowrap">
        <table className="border-gray-400 border-2">
          <thead>
            <tr className="h-6.25">
              <th className="table-header w-full px-2">Property</th>
              {nonEmptyRecipes.map(({ recipeIdx }) => (
                <th key={recipeIdx} className="table-header px-2 text-center">
                  {recipeIdx === 0 ? "Recipe" : `Ref ${recipeIdx}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {getEnabledProps().map((prop_key) => (
              <tr key={String(prop_key)} className="h-6.25">
                <td className="table-header w-full px-2 text-center">
                  {prop_key_as_med_str_js(prop_key)}
                </td>
                {nonEmptyRecipes.map(({ recipeIdx, mixProperties, mixTotal }) => (
                  <td key={recipeIdx} className="table-inner-cell min-w-12.5 px-2 comp-val">
                    {formattedPropCell(prop_key, mixProperties, mixTotal)}
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
