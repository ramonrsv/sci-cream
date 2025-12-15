"use client";

import { useState } from "react";

import { RecipeState, getMixTotal, calculateMixProperties } from "./recipe";
import { KeyFilter, QtyToggle, KeySelection } from "../lib/ui/key-selection";
import { getPropKeys } from "../lib/deprecated/sci-cream";
import { STATE_VAL } from "../lib/util";

import {
  PropKey,
  prop_key_as_med_str_js,
  composition_value_as_quantity as comp_val_as_qty,
  composition_value_as_percentage as comp_val_as_percent,
} from "@workspace/sci-cream";

const defaultSelectedProperties: Set<PropKey> = new Set([
  PropKey.MilkFat,
  PropKey.TotalFat,
  PropKey.MSNF,
  PropKey.Sugars,
  PropKey.TotalSolids,
  PropKey.PACtotal,
  PropKey.AbsPAC,
  PropKey.FPD,
  PropKey.ServingTemp,
  PropKey.HardnessAt14C,
]);

function isPropKeyQuantity(prop_key: PropKey) {
  return !(
    prop_key === PropKey.FPD ||
    prop_key === PropKey.ServingTemp ||
    prop_key == PropKey.HardnessAt14C
  );
}

export function MixPropertiesGrid({ recipeState }: { recipeState: RecipeState }) {
  const qtyToggleState = useState<QtyToggle>(QtyToggle.Quantity);
  const propertyFilterState = useState<KeyFilter>(KeyFilter.Auto);
  const selectedPropertiesState = useState<Set<PropKey>>(defaultSelectedProperties);

  const isPropertyEmpty = (prop_key: PropKey) => {
    const prop_val = mixProperties.get(prop_key);
    return prop_val === 0 || Number.isNaN(prop_val);
  };

  const isPropertySelected = (prop_key: PropKey) => {
    return selectedPropertiesState[STATE_VAL].has(prop_key);
  };

  const enabledProperties = () => {
    switch (propertyFilterState[STATE_VAL]) {
      case KeyFilter.All:
        return getPropKeys();
      case KeyFilter.Auto:
        return getPropKeys().filter((prop_key) => !isPropertyEmpty(prop_key));
      case KeyFilter.Custom:
        return getPropKeys().filter((prop_key) => isPropertySelected(prop_key));
    }
  };

  const formatPropertyValue = (prop: number, ingQty: number | undefined, isQty: boolean) => {
    const fmtF = (num: number) => {
      return Number.isNaN(num) ? "-" : Number(num.toFixed(1));
    };

    if (prop !== 0.0) {
      if (!isQty) {
        return fmtF(prop);
      }

      switch (qtyToggleState[STATE_VAL]) {
        case QtyToggle.Quantity:
          return ingQty ? fmtF(comp_val_as_qty(prop, ingQty)) : "";
        case QtyToggle.Percentage:
          return ingQty && mixTotal ? fmtF(comp_val_as_percent(prop, ingQty, mixTotal)) : "";
      }
    }
  };

  const formattedPropertyCell = (prop_key: PropKey) => {
    return formatPropertyValue(mixProperties.get(prop_key), mixTotal, isPropKeyQuantity(prop_key));
  };

  const mixTotal = getMixTotal(recipeState);
  const mixProperties = calculateMixProperties(recipeState);

  return (
    <div className="relative w-full">
      <KeySelection
        supportedQtyToggles={[QtyToggle.Quantity, QtyToggle.Percentage]}
        qtyToggleState={qtyToggleState}
        keyFilterState={propertyFilterState}
        selectedKeysState={selectedPropertiesState}
        getKeys={getPropKeys}
        key_as_med_str_js={prop_key_as_med_str_js}
      />
      <div className="border-gray-400 border-2 overflow-x-auto whitespace-nowrap">
        <table className="border-collapse">
          <tbody>
            {enabledProperties().map((prop_key) => (
              <tr key={prop_key} className="h-[25px]">
                <td className="table-header w-full px-2 text-center">
                  {prop_key_as_med_str_js(prop_key)}
                </td>
                <td className="table-inner-cell min-w-[50px] px-2 text-center">
                  {formattedPropertyCell(prop_key)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
