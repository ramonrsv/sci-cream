"use client";

import { useState } from "react";

import { RecipeState } from "./recipe";
import { FlatHeader, flat_header_as_med_str_js } from "@workspace/sci-cream";
import { STATE_VAL, getTsEnumStringKeys } from "../lib/util";

enum QtyToggle {
  /// The raw composition value as stored in the Ingredient, independent of quantity
  Composition = "Composition",
  /// The quantity in grams based on the ingredient quantity in the recipe
  Quantity = "Quantity (g)",
  /// The percentage of the mix based on the ingredient quantity and total mix quantity
  Percentage = "Quantity (%)",
}

export function IngredientCompositionGrid({
  recipeState,
}: {
  recipeState: RecipeState;
}) {
  const [qtyToggle, setQtyToggle] = useState<QtyToggle>(QtyToggle.Quantity);

  const getMixTotal = () =>
    recipeState.reduce((sum, [row, _]) => sum + (row.quantity || 0), 0);

  const formattedCompCell = (index: number, header: any) => {
    const ingredient = recipeState[index][STATE_VAL].ingredient;
    const ingQty = recipeState[index][STATE_VAL].quantity || undefined;
    const mixTotal = getMixTotal();

    if (ingredient && ingredient.composition) {
      const flatRep = ingredient.composition.to_flat_representation_js();

      if (flatRep.has(header)) {
        let comp = flatRep.get(header)!;

        switch (qtyToggle) {
          case QtyToggle.Composition:
            return Number(comp.toFixed(1));
          case QtyToggle.Quantity:
            return ingQty ? Number(((comp * ingQty) / 100).toFixed(1)) : "";
          case QtyToggle.Percentage:
            return mixTotal > 0 && ingQty
              ? Number(((comp * ingQty) / mixTotal).toFixed(1))
              : "";
        }
      }
    }
    return "";
  };

  return (
    <div>
      <select
        className="border border-gray-400 text-sm text-gray-900"
        value={qtyToggle}
        onChange={(e) => setQtyToggle(e.target.value as QtyToggle)}
      >
        <option value={QtyToggle.Composition}>{QtyToggle.Composition}</option>
        <option value={QtyToggle.Quantity}>{QtyToggle.Quantity}</option>
        <option value={QtyToggle.Percentage}>{QtyToggle.Percentage}</option>
      </select>
      <div className="w-full min-w-[400px] overflow-x-auto whitespace-nowrap border-2 border-gray-400">
        <table className="border-collapse">
          {/* Header */}
          <thead>
            {/* Composition Header */}
            <tr key={0} className="h-[24px] table-header-footer text-center">
              {getTsEnumStringKeys(FlatHeader).map((header) => (
                <th
                  key={header}
                  className="px-1 w-fit border-b-1 border-gray-400 border-r border-gray-300"
                >
                  {flat_header_as_med_str_js(header)}
                </th>
              ))}
            </tr>
            {/* Totals Row */}
            <tr className="h-[25px] table-header-footer">
              {getTsEnumStringKeys(FlatHeader).map((header) => (
                <td
                  key={header}
                  className="text-center border-b border-gray-400 border-r border-gray-300"
                ></td>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Composition Rows */}
            {/* @todo The very last row is a little taller than the rest; not sure why */}
            {recipeState.map((_, index) => (
              <tr key={index} className="h-[25px] border-b border-gray-300">
                {getTsEnumStringKeys(FlatHeader).map((header) => (
                  <td
                    key={header}
                    className="border-r border-gray-300 text-sm text-gray-900 text-center"
                  >
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
