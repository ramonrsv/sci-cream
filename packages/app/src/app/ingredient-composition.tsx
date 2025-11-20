"use client";

import { useState } from "react";

import { RecipeState } from "./recipe";
import { FlatHeader, flat_header_as_med_str_js } from "@workspace/sci-cream";
import { STATE_VAL, getTsEnumNumberKeys, getTsEnumStringKeys } from "../lib/util";

enum QtyToggle {
  /// The raw composition value as stored in the Ingredient, independent of quantity
  Composition = "Composition",
  /// The quantity in grams based on the ingredient quantity in the recipe
  Quantity = "Quantity (g)",
  /// The percentage of the mix based on the ingredient quantity and total mix quantity
  Percentage = "Quantity (%)",
}

export function IngredientCompositionGrid({ recipeState }: { recipeState: RecipeState }) {
  const [qtyToggle, setQtyToggle] = useState<QtyToggle>(QtyToggle.Quantity);

  const getMixTotal = () => recipeState.reduce((sum, [row, _]) => sum + (row.quantity || 0), 0);

  const enabledHeaderNumberKeys = () => getTsEnumNumberKeys(FlatHeader);
  const enabledHeaderStringKeys = () => getTsEnumStringKeys(FlatHeader);

  const enabledHeaderStringKeysIndexed = () =>
    Array.from(getTsEnumStringKeys(FlatHeader).entries());

  const formattedCompCell = (index: number, header: FlatHeader) => {
    const ingredient = recipeState[index][STATE_VAL].ingredient;
    const ingQty = recipeState[index][STATE_VAL].quantity || undefined;
    const mixTotal = getMixTotal();

    if (ingredient && ingredient.composition) {
      const comp = ingredient.composition.get_flat_header_value(header);

      if (comp !== undefined) {
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
    <div className="w-full min-w-[200px]">
      <select
        className="border-gray-400 border text-gray-900 text-sm"
        value={qtyToggle}
        onChange={(e) => setQtyToggle(e.target.value as QtyToggle)}
      >
        <option value={QtyToggle.Composition}>{QtyToggle.Composition}</option>
        <option value={QtyToggle.Quantity}>{QtyToggle.Quantity}</option>
        <option value={QtyToggle.Percentage}>{QtyToggle.Percentage}</option>
      </select>
      <div className="border-gray-400 border-2 overflow-x-auto whitespace-nowrap">
        <table className="border-collapse">
          {/* Header */}
          <thead>
            {/* Composition Header */}
            {/* @todo The left-most and right-most borders of the table are still not right */}
            <tr className="h-[24px]">
              {enabledHeaderStringKeys().map((header) => (
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
              {enabledHeaderStringKeys().map((header) => (
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
                {enabledHeaderNumberKeys().map((header) => (
                  <td key={header} className="table-inner-cell text-center">
                    {formattedCompCell(index, header as unknown as FlatHeader)}
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
