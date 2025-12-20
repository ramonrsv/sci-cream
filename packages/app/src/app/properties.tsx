"use client";

import { useState } from "react";

import { RecipeState, getMixTotal, calculateMixProperties } from "./recipe";
import { COMPONENT_H_PX } from "./page";
import { KeyFilter, QtyToggle, KeySelection, getEnabledKeys } from "../lib/ui/key-selection";
import { formatCompositionValue } from "../lib/ui/fmt-comp-values";
import { PropKey, getPropKeys } from "../lib/sci-cream/sci-cream";
import { STATE_VAL } from "../lib/util";

import {
  CompKey,
  FpdKey,
  isCompKey,
  getMixProperty,
  prop_key_as_med_str_js,
} from "@workspace/sci-cream";

const defaultSelectedProperties: Set<PropKey> = new Set([
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

export function MixPropertiesGrid({ recipeState }: { recipeState: RecipeState }) {
  const qtyToggleState = useState<QtyToggle>(QtyToggle.Percentage);
  const propsFilterState = useState<KeyFilter>(KeyFilter.Auto);
  const selectedPropsState = useState<Set<PropKey>>(defaultSelectedProperties);

  const isPropEmpty = (prop_key: PropKey) => {
    const prop_val = getMixProperty(mixProperties, prop_key);
    return prop_val === 0 || Number.isNaN(prop_val);
  };

  const getEnabledProps = () => {
    return getEnabledKeys(propsFilterState, selectedPropsState, getPropKeys, isPropEmpty);
  };

  const isQuantity = (prop_key: PropKey): boolean => {
    return (
      isCompKey(prop_key) &&
      prop_key !== CompKey[CompKey.AbsPAC] &&
      prop_key !== CompKey[CompKey.EmulsifiersPerFat] &&
      prop_key !== CompKey[CompKey.StabilizersPerWater]
    );
  };

  const formattedPropCell = (prop_key: PropKey) => {
    return formatCompositionValue(
      getMixProperty(mixProperties, prop_key),
      mixTotal,
      mixTotal,
      qtyToggleState[STATE_VAL],
      isQuantity(prop_key)
    );
  };

  const mixTotal = getMixTotal(recipeState);
  const mixProperties = calculateMixProperties(recipeState);

  return (
    <div id="mix-properties-grid" className={`relative w-full h-[${COMPONENT_H_PX}px] bg-gray-100`}>
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
      {/* @todo overflow-x-visible should work instead of min-w-[220px], but it has a weird delay in applying */}
      <div className="border-gray-400 border-2 max-h-[580px] min-w-[220px] overflow-y-auto whitespace-nowrap">
        <table className="border-collapse">
          <tbody>
            {getEnabledProps().map((prop_key) => (
              <tr key={String(prop_key)} className="h-[25px]">
                {/* @todo The top-most border for the header column is not right, shows double */}
                <td className="table-header-no-border border-gray-400 border-t border-r w-full px-2 text-center">
                  {prop_key_as_med_str_js(prop_key)}
                </td>
                <td className="table-inner-cell min-w-[50px] px-2 comp-val">
                  {formattedPropCell(prop_key)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
