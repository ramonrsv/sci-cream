"use client";

import { useState } from "react";

import { RecipeState, getMixTotal, calculateMixComposition } from "./recipe";
import { getFlatHeaders } from "../lib/deprecated/sci-cream";
import { STATE_VAL } from "../lib/util";

import {
  FlatHeader,
  flat_header_as_med_str_js,
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

const defaultSelectedColumns: Set<FlatHeader> = new Set([
  FlatHeader.MilkFat,
  FlatHeader.TotalFat,
  FlatHeader.MSNF,
  FlatHeader.Sugars,
  FlatHeader.TotalSolids,
]);

export function IngredientCompositionGrid({ recipeState }: { recipeState: RecipeState }) {
  const [qtyToggle, setQtyToggle] = useState<QtyToggle>(QtyToggle.Quantity);
  const [columnFilter, setColumnFilter] = useState<ColumnFilter>(ColumnFilter.Auto);
  const [columnSelectVisible, setColumnSelectVisible] = useState<boolean>(false);
  const [selectedColumns, setSelectedColumns] = useState<Set<FlatHeader>>(defaultSelectedColumns);

  const isCompColumnEmpty = (header: FlatHeader) => {
    return recipeState.every(([row, _]) => {
      return (
        row.ingredient === undefined ||
        row.ingredient.composition?.get_flat_header_value(header) === 0.0
      );
    });
  };

  const isCompColumnSelected = (header: FlatHeader) => {
    return selectedColumns.has(header);
  };

  const updateSelectedColumn = (header: FlatHeader) => {
    const newSet = new Set(selectedColumns);
    if (newSet.has(header)) {
      newSet.delete(header);
    } else {
      newSet.add(header);
    }
    setSelectedColumns(newSet);
  };

  const enabledHeaders = () => {
    switch (columnFilter) {
      case ColumnFilter.All:
        return getFlatHeaders();
      case ColumnFilter.Auto:
        return getFlatHeaders().filter((header) => !isCompColumnEmpty(header));
      case ColumnFilter.Custom:
        return getFlatHeaders().filter((header) => isCompColumnSelected(header));
    }
  };

  const enabledHeadersIndexed = () => Array.from(enabledHeaders().entries());

  const formatCompValue = (comp: number, ingQty: number | undefined) => {
    const fmtF = (num: number) => {
      return Number(num.toFixed(1));
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

  const formattedTotalCell = (header: FlatHeader) => {
    return formatCompValue(mixComposition.get_flat_header_value(header), mixTotal);
  };

  const formattedCompCell = (index: number, header: FlatHeader) => {
    const ingredient = recipeState[index][STATE_VAL].ingredient;
    const ingQty = recipeState[index][STATE_VAL].quantity;

    return ingredient && ingredient.composition
      ? formatCompValue(ingredient.composition.get_flat_header_value(header), ingQty)
      : "";
  };

  const mixTotal = getMixTotal(recipeState);
  const mixComposition = calculateMixComposition(recipeState);

  return (
    <div className="relative w-full min-w-[200px]">
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
            {getFlatHeaders().map((header) => (
              <li key={header}>
                <input
                  type="checkbox"
                  checked={isCompColumnSelected(header)}
                  onChange={() => updateSelectedColumn(header)}
                />
                {" " + flat_header_as_med_str_js(header)}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="border-gray-400 border-2 overflow-x-auto whitespace-nowrap">
        <table className="border-collapse">
          {/* Header */}
          <thead>
            {/* Composition Header */}
            {/* @todo The left-most and right-most borders of the table are still not right */}
            <tr className="h-[24px]">
              {enabledHeaders().map((header) => (
                <th
                  key={header}
                  className="table-header-no-border px-1 border-gray-400 border-b border-r w-fit text-center"
                >
                  {flat_header_as_med_str_js(header)}
                </th>
              ))}
            </tr>
            {/* Totals Row */}
            {/* @todo The left-most and right-most borders of the table are still not right */}
            <tr className="h-[25px]">
              {enabledHeaders().map((header) => (
                <td
                  key={header}
                  className="table-header-no-border px-1 border-gray-400 border-b border-r text-center"
                >
                  {formattedTotalCell(header)}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Composition Rows */}
            {/* @todo The very last row is a little taller than the rest; not sure why */}
            {recipeState.map((_, index) => (
              <tr key={index} className="table-inner-cell h-[25px]">
                {enabledHeaders().map((header) => (
                  <td key={header} className="table-inner-cell text-center">
                    {formattedCompCell(index, header)}
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
