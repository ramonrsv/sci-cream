"use client";

import { useState } from "react";

import { RecipeState, getMixTotal, calculateMixComposition } from "./recipe";
import { KeyFilter, QtyToggle, KeySelection, getEnabledKeys } from "../lib/ui/key-selection";
import { formatCompositionValue } from "../lib/ui/fmt-comp-values";
import { getCompKeys as getCompKeysAll } from "../lib/sci-cream/sci-cream";
import { STATE_VAL } from "../lib/util";

import { CompKey, comp_key_as_med_str_js } from "@workspace/sci-cream";

function getCompKeys(): CompKey[] {
  return getCompKeysAll().filter(
    (key) =>
      // These values aren't very meaningful in a per-ingredient breakdown
      key !== CompKey.AbsPAC &&
      key !== CompKey.EmulsifiersPerFat &&
      key !== CompKey.StabilizersPerWater
  );
}

const defaultSelectedComps: Set<CompKey> = new Set([
  CompKey.MilkFat,
  CompKey.TotalFat,
  CompKey.MSNF,
  CompKey.Sugars,
  CompKey.TotalSolids,
]);

export function IngredientCompositionGrid({ recipeState }: { recipeState: RecipeState }) {
  const qtyToggleState = useState<QtyToggle>(QtyToggle.Quantity);
  const compsFilterState = useState<KeyFilter>(KeyFilter.Auto);
  const selectedCompsState = useState<Set<CompKey>>(defaultSelectedComps);

  const isPropEmpty = (comp_key: CompKey) => {
    return recipeState.every(([row, _]) => {
      return row.ingredient === undefined || row.ingredient.composition?.get(comp_key) === 0.0;
    });
  };

  const getEnabledComps = () => {
    return getEnabledKeys(compsFilterState, selectedCompsState, getCompKeys, isPropEmpty);
  };

  const isQuantity = (prop_key: CompKey): boolean => {
    return (
      prop_key !== CompKey.AbsPAC &&
      prop_key !== CompKey.EmulsifiersPerFat &&
      prop_key !== CompKey.StabilizersPerWater
    );
  };

  const formattedTotalCell = (comp_key: CompKey) => {
    return formatCompositionValue(
      mixComposition.get(comp_key),
      mixTotal,
      mixTotal,
      qtyToggleState[STATE_VAL],
      isQuantity(comp_key)
    );
  };

  const formattedCompCell = (index: number, comp_key: CompKey) => {
    const ingredient = recipeState[index][STATE_VAL].ingredient;
    const ingQty = recipeState[index][STATE_VAL].quantity;

    return ingredient && ingredient.composition
      ? formatCompositionValue(
          ingredient.composition.get(comp_key),
          ingQty,
          mixTotal,
          qtyToggleState[STATE_VAL],
          isQuantity(comp_key)
        )
      : "";
  };

  const mixTotal = getMixTotal(recipeState);
  const mixComposition = calculateMixComposition(recipeState);

  return (
    <div
      id="ingredient-composition-grid"
      className={`relative w-full min-w-[200px] component-h bg-gray-100`}
    >
      <KeySelection
        qtyToggleComponent={{
          supportedQtyToggles: [QtyToggle.Composition, QtyToggle.Quantity, QtyToggle.Percentage],
          qtyToggleState: qtyToggleState,
        }}
        keyFilterState={compsFilterState}
        selectedKeysState={selectedCompsState}
        getKeys={getCompKeys}
        key_as_med_str_js={comp_key_as_med_str_js}
      />
      <div className="border-gray-400 border-2 overflow-x-auto whitespace-nowrap">
        <table className="border-collapse">
          {/* Header */}
          <thead>
            {/* Composition Header */}
            {/* @todo The left-most and right-most borders of the table are still not right */}
            <tr className="h-[24px]">
              {getEnabledComps().map((comp_key) => (
                <th
                  key={comp_key}
                  className="table-header-no-border px-1 border-gray-400 border-b border-r w-fit text-center"
                >
                  {comp_key_as_med_str_js(comp_key)}
                </th>
              ))}
            </tr>
            {/* Totals Row */}
            {/* @todo The left-most and right-most borders of the table are still not right */}
            <tr className="h-[25px]">
              {getEnabledComps().map((comp_key) => (
                <td
                  key={comp_key}
                  className="table-header-no-border border-gray-400 border-b border-r px-1 comp-val"
                >
                  {formattedTotalCell(comp_key)}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Composition Rows */}
            {/* @todo The very last row is a little taller than the rest; not sure why */}
            {recipeState.map((_, index) => (
              <tr key={index} className="h-[25px]">
                {getEnabledComps().map((comp_key) => (
                  <td key={comp_key} className="table-inner-cell px-1 comp-val">
                    {formattedCompCell(index, comp_key)}
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
