"use client";

import { useState, useRef, useEffect } from "react";

import { Recipe, isRecipeEmpty } from "./recipe";
import { KeyFilter, QtyToggle, KeySelection, getEnabledKeys } from "../lib/ui/key-selection";
import { applyQtyToggleAndFormat } from "../lib/ui/comp-values";
import { isPropKeyQuantity } from "../lib/sci-cream/sci-cream";
import { STATE_VAL } from "../lib/util";

import {
  CompKey,
  FpdKey,
  PropKey,
  getPropKeys,
  getMixProperty,
  MixProperties,
  prop_key_as_med_str_js,
} from "@workspace/sci-cream";

export const DEFAULT_SELECTED_PROPERTIES: Set<PropKey> = new Set([
  CompKey[CompKey.MilkFat],
  CompKey[CompKey.EggFat],
  CompKey[CompKey.CacaoFat],
  CompKey[CompKey.NutFat],
  CompKey[CompKey.OtherFat],
  CompKey[CompKey.TotalFat],
  CompKey[CompKey.MSNF],
  CompKey[CompKey.EggSNF],
  CompKey[CompKey.CocoaSNF],
  CompKey[CompKey.NutSNF],
  CompKey[CompKey.TotalSNF],
  CompKey[CompKey.TotalSNFS],
  CompKey[CompKey.TotalSolids],
  CompKey[CompKey.Water],
  CompKey[CompKey.Sugars],
  CompKey[CompKey.ArtificialSweeteners],
  CompKey[CompKey.PACtotal],
  CompKey[CompKey.AbsPAC],
  FpdKey[FpdKey.FPD],
  FpdKey[FpdKey.ServingTemp],
  FpdKey[FpdKey.HardnessAt14C],
] as PropKey[]);

export function MixPropertiesGrid({ recipes: allRecipes }: { recipes: Recipe[] }) {
  const qtyToggleState = useState<QtyToggle>(QtyToggle.Percentage);
  const propsFilterState = useState<KeyFilter>(KeyFilter.Auto);
  const selectedPropsState = useState<Set<PropKey>>(DEFAULT_SELECTED_PROPERTIES);

  const [hasHorizontalScroll, setHasHorizontalScroll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateScrollStatus = () => {
    if (containerRef.current) {
      setHasHorizontalScroll(containerRef.current.scrollWidth > containerRef.current.clientWidth);
    }
  };

  useEffect(() => {
    updateScrollStatus();
    window.addEventListener("resize", updateScrollStatus);
    return () => window.removeEventListener("resize", updateScrollStatus);
  }, [allRecipes, selectedPropsState, qtyToggleState, propsFilterState]);

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
      <div
        ref={containerRef}
        className={`component-inner-border min-w-55 overflow-y-auto whitespace-nowrap`}
        style={{ height: `calc(100% - ${hasHorizontalScroll ? 20 : 35}px)` }}
      >
        <table className="relative -top-px">
          <thead>
            <tr className="h-6.25">
              <th className="table-header w-full px-2">Property</th>
              {recipes.map((recipe) => (
                <th key={recipe.index} className="table-header px-2 text-center">
                  {recipe.name}
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
                {recipes.map((recipe) => (
                  <td key={recipe.index} className="table-inner-cell comp-val min-w-12.5 px-2">
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
