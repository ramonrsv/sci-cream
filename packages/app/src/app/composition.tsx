"use client";

import { useState } from "react";

import { RecipeState, getMixTotal, calculateMixComposition } from "./recipe";
import { getCompKeys } from "../lib/deprecated/sci-cream";
import { STATE_VAL } from "../lib/util";

import {
  CompKey,
  comp_key_as_med_str_js,
  composition_value_as_quantity as comp_val_as_qty,
  composition_value_as_percentage as comp_val_as_percent,
} from "@workspace/sci-cream";

enum QtyToggle {
  /// The raw composition value as stored in the Ingredient, independent of quantity
  Composition = "Composition",
  /// The quantity in grams based on the ingredient quantity in the recipe
  Quantity = "Quantity (g)",
  /// The percentage of the mix based on the ingredient quantity and total mix quantity
  Percentage = "Quantity (%)",
}

enum ColumnFilter {
  Auto = "Auto",
  All = "All",
  Custom = "Custom",
}

const defaultSelectedColumns: Set<CompKey> = new Set([
  CompKey.MilkFat,
  CompKey.TotalFat,
  CompKey.MSNF,
  CompKey.Sugars,
  CompKey.TotalSolids,
]);

export function IngredientCompositionGrid({ recipeState }: { recipeState: RecipeState }) {
  const [qtyToggle, setQtyToggle] = useState<QtyToggle>(QtyToggle.Quantity);
  const [columnFilter, setColumnFilter] = useState<ColumnFilter>(ColumnFilter.Auto);
  const [columnSelectVisible, setColumnSelectVisible] = useState<boolean>(false);
  const [selectedColumns, setSelectedColumns] = useState<Set<CompKey>>(defaultSelectedColumns);

  const isCompColumnEmpty = (comp_key: CompKey) => {
    return recipeState.every(([row, _]) => {
      return row.ingredient === undefined || row.ingredient.composition?.get(comp_key) === 0.0;
    });
  };

  const isCompColumnSelected = (comp_key: CompKey) => {
    return selectedColumns.has(comp_key);
  };

  const updateSelectedColumn = (comp_key: CompKey) => {
    const newSet = new Set(selectedColumns);
    if (newSet.has(comp_key)) {
      newSet.delete(comp_key);
    } else {
      newSet.add(comp_key);
    }
    setSelectedColumns(newSet);
  };

  const enabledHeaders = () => {
    switch (columnFilter) {
      case ColumnFilter.All:
        return getCompKeys();
      case ColumnFilter.Auto:
        return getCompKeys().filter((comp_key) => !isCompColumnEmpty(comp_key));
      case ColumnFilter.Custom:
        return getCompKeys().filter((comp_key) => isCompColumnSelected(comp_key));
    }
  };

  const enabledHeadersIndexed = () => Array.from(enabledHeaders().entries());

  const formatCompValue = (comp: number, ingQty: number | undefined) => {
    const fmtF = (num: number) => {
      return Number.isNaN(num) ? "-" : Number(num.toFixed(1));
    };

    if (comp !== 0.0) {
      switch (qtyToggle) {
        case QtyToggle.Composition:
          return fmtF(comp);
        case QtyToggle.Quantity:
          return ingQty ? fmtF(comp_val_as_qty(comp, ingQty)) : "";
        case QtyToggle.Percentage:
          return ingQty && mixTotal ? fmtF(comp_val_as_percent(comp, ingQty, mixTotal)) : "";
      }
    }
  };

  const formattedTotalCell = (comp_key: CompKey) => {
    return formatCompValue(mixComposition.get(comp_key), mixTotal);
  };

  const formattedCompCell = (index: number, comp_key: CompKey) => {
    const ingredient = recipeState[index][STATE_VAL].ingredient;
    const ingQty = recipeState[index][STATE_VAL].quantity;

    return ingredient && ingredient.composition
      ? formatCompValue(ingredient.composition.get(comp_key), ingQty)
      : "";
  };

  const mixTotal = getMixTotal(recipeState);
  const mixComposition = calculateMixComposition(recipeState);

  return (
    <div className="relative w-full min-w-[200px]">
      <div>
        <select
          className="border-gray-400 border text-gray-900 text-sm"
          value={qtyToggle}
          onChange={(e) => setQtyToggle(e.target.value as QtyToggle)}
        >
          <option value={QtyToggle.Composition}>{QtyToggle.Composition}</option>
          <option value={QtyToggle.Quantity}>{QtyToggle.Quantity}</option>
          <option value={QtyToggle.Percentage}>{QtyToggle.Percentage}</option>
        </select>
        <select
          className="ml-2 border-gray-400 border text-gray-900 text-sm"
          value={columnFilter}
          onChange={(e) => {
            setColumnFilter(e.target.value as ColumnFilter);
            if (e.target.value === ColumnFilter.Custom) {
              setColumnSelectVisible(true);
            }
          }}
        >
          <option value={ColumnFilter.Auto}>{ColumnFilter.Auto}</option>
          <option value={ColumnFilter.All}>{ColumnFilter.All}</option>
          <option value={ColumnFilter.Custom}>{ColumnFilter.Custom}</option>
        </select>
        {columnSelectVisible && (
          <div className="popup top-0 left-47 w-fit pl-1 pr-2 whitespace-nowrap">
            <button onClick={() => setColumnSelectVisible(false)}>Done</button>
            <ul>
              {getCompKeys().map((comp_key) => (
                <li key={comp_key}>
                  <input
                    type="checkbox"
                    checked={isCompColumnSelected(comp_key)}
                    onChange={() => updateSelectedColumn(comp_key)}
                  />
                  {" " + comp_key_as_med_str_js(comp_key)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="border-gray-400 border-2 overflow-x-auto whitespace-nowrap">
        <table className="border-collapse">
          {/* Header */}
          <thead>
            {/* Composition Header */}
            {/* @todo The left-most and right-most borders of the table are still not right */}
            <tr className="h-[24px]">
              {enabledHeaders().map((comp_key) => (
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
              {enabledHeaders().map((comp_key) => (
                <td
                  key={comp_key}
                  className="table-header-no-border px-1 border-gray-400 border-b border-r text-center"
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
                {enabledHeaders().map((comp_key) => (
                  <td key={comp_key} className="table-inner-cell text-center">
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
