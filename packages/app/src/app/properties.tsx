"use client";

import { useState } from "react";
import { GripVertical } from "lucide-react";

import { Recipe, isRecipeEmpty } from "./recipe";
import { KeyFilter, KeyFilterSelect, getEnabledKeys } from "../lib/ui/key-filter-select";
import { QtyToggle, QtyToggleSelect } from "../lib/ui/qty-toggle-select";
import { applyQtyToggleAndFormat } from "../lib/ui/comp-values";
import { isPropKeyQuantity } from "../lib/sci-cream/sci-cream";
import { STATE_VAL } from "../lib/util";
import { DRAG_HANDLE_ICON_SIZE } from "../lib/ui/constants";

import {
  CompKey,
  FpdKey,
  PropKey,
  compToPropKey,
  fpdToPropKey,
  getPropKeys,
  getMixProperty,
  MixProperties,
  prop_key_as_med_str,
} from "@workspace/sci-cream";

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

export function MixPropertiesGrid({ recipes: allRecipes }: { recipes: Recipe[] }) {
  const qtyToggleState = useState<QtyToggle>(QtyToggle.Percentage);
  const propsFilterState = useState<KeyFilter>(KeyFilter.Auto);
  const selectedPropsState = useState<Set<PropKey>>(DEFAULT_SELECTED_PROPERTIES);

  const isPropEmpty = (prop_key: PropKey) => {
    // All PropKeys are considered to be empty if all displayed recipes are empty
    // This handles values that are not zero for empty recipes, e.g. PropKey.Water
    if (recipes.every((recipe) => isRecipeEmpty(recipe))) {
      return true;
    }

    for (const recipe of recipes) {
      const prop_val = getMixProperty(recipe.mixProperties!, prop_key);
      if (!(prop_val === 0 || Number.isNaN(prop_val))) {
        return false;
      }
    }
    return true;
  };

  const autoHeuristic = (prop_key: PropKey) => {
    return DEFAULT_SELECTED_PROPERTIES.has(prop_key);
  };

  const getEnabledProps = () => {
    return getEnabledKeys(
      propsFilterState,
      selectedPropsState,
      getPropKeys,
      isPropEmpty,
      autoHeuristic,
    );
  };

  const formattedPropCell = (prop_key: PropKey, mixProperties: MixProperties, mixTotal: number) => {
    return applyQtyToggleAndFormat(
      getMixProperty(mixProperties, prop_key),
      mixTotal,
      mixTotal,
      qtyToggleState[STATE_VAL],
      isPropKeyQuantity(prop_key),
    );
  };

  // Only display the main recipe and non-empty reference recipes
  const recipes = allRecipes.filter((recipe) => recipe.index == 0 || !isRecipeEmpty(recipe));

  return (
    <div id="mix-properties-grid" className="grid-component h-full w-full">
      <div className="flex items-center">
        <GripVertical size={DRAG_HANDLE_ICON_SIZE} className="drag-handle" />
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
      <div className={"h-[calc(100%-33px)] min-w-55 overflow-y-auto whitespace-nowrap"}>
        <table>
          <thead>
            <tr className="h-6.25">
              <th className="table-header w-full px-1.25">Property</th>
              {/* Recipe Names */}
              {recipes.map((recipe) => (
                <th key={recipe.index} className="table-header px-1.25 text-center">
                  {recipe.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {getEnabledProps().map((prop_key) => (
              <tr key={String(prop_key)} className="h-6.25">
                {/* Property Name */}
                <td className="table-header w-full px-1.25 text-center">
                  {prop_key_as_med_str(prop_key)}
                </td>
                {/* Property Values for Recipes */}
                {recipes.map((recipe) => (
                  <td key={recipe.index} className="table-inner-cell comp-val px-1.25">
                    {formattedPropCell(prop_key, recipe.mixProperties!, recipe.mixTotal!)}
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
