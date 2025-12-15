"use client";

import { useState } from "react";

import { RecipeState, getMixTotal, calculateMixProperties } from "./recipe";
import { getPropKeys } from "../lib/deprecated/sci-cream";

import {
  PropKey,
  prop_key_as_med_str_js,
  composition_value_as_quantity as comp_val_as_qty,
  composition_value_as_percentage as comp_val_as_percent,
} from "@workspace/sci-cream";

enum QtyToggle {
  /// The quantity in grams based on the ingredient quantity in the recipe
  Quantity = "Quantity (g)",
  /// The percentage of the mix based on the ingredient quantity and total mix quantity
  Percentage = "Quantity (%)",
}

enum PropertyFilter {
  Auto = "Auto",
  All = "All",
  Custom = "Custom",
}

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
  const [qtyToggle, setQtyToggle] = useState<QtyToggle>(QtyToggle.Quantity);
  const [propertyFilter, setPropertyFilter] = useState<PropertyFilter>(PropertyFilter.Auto);
  const [propertySelectVisible, setPropertySelectVisible] = useState<boolean>(false);
  const [selectedProperties, setSelectedProperties] =
    useState<Set<PropKey>>(defaultSelectedProperties);

  const isPropertyEmpty = (prop_key: PropKey) => {
    const prop_val = mixProperties.get(prop_key);
    return prop_val === 0 || Number.isNaN(prop_val);
  };

  const isPropertySelected = (prop_key: PropKey) => {
    return selectedProperties.has(prop_key);
  };

  const updateSelectedProperty = (prop_key: PropKey) => {
    const newSet = new Set(selectedProperties);
    if (newSet.has(prop_key)) {
      newSet.delete(prop_key);
    } else {
      newSet.add(prop_key);
    }
    setSelectedProperties(newSet);
  };

  const enabledProperties = () => {
    switch (propertyFilter) {
      case PropertyFilter.All:
        return getPropKeys();
      case PropertyFilter.Auto:
        return getPropKeys().filter((prop_key) => !isPropertyEmpty(prop_key));
      case PropertyFilter.Custom:
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

      switch (qtyToggle) {
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
      <select
        className="border-gray-400 border text-gray-900 text-sm"
        value={qtyToggle}
        onChange={(e) => setQtyToggle(e.target.value as QtyToggle)}
      >
        <option value={QtyToggle.Quantity}>{QtyToggle.Quantity}</option>
        <option value={QtyToggle.Percentage}>{QtyToggle.Percentage}</option>
      </select>
      <select
        className="ml-2 border-gray-400 border text-gray-900 text-sm"
        value={propertyFilter}
        onChange={(e) => {
          setPropertyFilter(e.target.value as PropertyFilter);
          if (e.target.value === PropertyFilter.Custom) {
            setPropertySelectVisible(true);
          }
        }}
      >
        <option value={PropertyFilter.Auto}>{PropertyFilter.Auto}</option>
        <option value={PropertyFilter.All}>{PropertyFilter.All}</option>
        <option value={PropertyFilter.Custom}>{PropertyFilter.Custom}</option>
      </select>
      {propertySelectVisible && (
        <div className="popup top-0 left-47 w-fit pl-1 pr-2 whitespace-nowrap">
          <button onClick={() => setPropertySelectVisible(false)}>Done</button>
          <ul>
            {getPropKeys().map((prop_key) => (
              <li key={prop_key}>
                <input
                  type="checkbox"
                  checked={isPropertySelected(prop_key)}
                  onChange={() => updateSelectedProperty(prop_key)}
                />
                {" " + prop_key_as_med_str_js(prop_key)}
              </li>
            ))}
          </ul>
        </div>
      )}
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
