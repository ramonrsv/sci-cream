"use client";

import { useState } from "react";

import { RecipeState } from "./recipe";
import { FlatHeader, flat_header_as_med_str_js } from "@workspace/sci-cream";
import { getFlatHeaders } from "../lib/deprecated/sci-cream";
import { STATE_VAL } from "../lib/util";

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

export function IngredientCompositionGrid({ recipeState }: { recipeState: RecipeState }) {
  const [qtyToggle, setQtyToggle] = useState<QtyToggle>(QtyToggle.Quantity);
  const [columnFilter, setColumnFilter] = useState<ColumnFilter>(ColumnFilter.Auto);
  const [columnSelectVisible, setColumnSelectVisible] = useState<boolean>(false);

  const getMixTotal = () => recipeState.reduce((sum, [row, _]) => sum + (row.quantity || 0), 0);

  const enabledHeaders = () => getFlatHeaders();
  const enabledHeadersIndexed = () => Array.from(enabledHeaders().entries());

  const formattedCompCell = (index: number, header: FlatHeader) => {
    const ingredient = recipeState[index][STATE_VAL].ingredient;
    const ingQty = recipeState[index][STATE_VAL].quantity || undefined;
    const mixTotal = getMixTotal();

    if (ingredient && ingredient.composition) {
      const comp = ingredient.composition.get_flat_header_value(header);

      if (comp !== 0.0) {
        switch (qtyToggle) {
          case QtyToggle.Composition:
            return Number(comp.toFixed(1));
          case QtyToggle.Quantity:
            return ingQty ? Number(((comp * ingQty) / 100).toFixed(1)) : "";
          case QtyToggle.Percentage:
            return mixTotal > 0 && ingQty ? Number(((comp * ingQty) / mixTotal).toFixed(1)) : "";
        }
      }
    }
    return "";
  };

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
        <div className="popup top-0 left-47 w-fit pl-1 pr-2">
          <button onClick={() => setColumnSelectVisible(false)}>Done</button>
          <ul>
            {getFlatHeaders().map((header) => (
              <li key={header}>
                <input type="checkbox" />
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
                ></td>
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
