"use client";

import { Recipe } from "@/app/_components/recipe";
import { formatCompositionValue } from "@/lib/comp-value-format";

/**
 * Bare read-only table of a recipe's ingredients, quantities (in grams), and per-row percentage
 * of the mix total. Empty ingredient rows are filtered out so the table is sized to its content,
 * suitable for embedding in recipe-search results or save dialogs.
 *
 * Caller is responsible for sizing/scrolling.
 */
export function RecipeTable({ recipe }: { recipe: Recipe }) {
  const mixTotal = recipe.mixTotal;
  const rows = recipe.ingredientRows.filter((row) => row.name !== "" || row.quantity !== undefined);

  return (
    <table className="w-full">
      <thead>
        <tr className="h-6.25 text-center">
          <th className="table-header min-w-50">Ingredient</th>
          <th className="table-header w-15">Qty (g)</th>
          <th className="table-header w-13.75 pr-1 pl-2 whitespace-nowrap">Qty (%)</th>
        </tr>
        <tr className="h-6.25">
          <td className="table-header px-1 text-center">Total</td>
          <td className="table-header comp-val px-3.75">{mixTotal ? mixTotal.toFixed(0) : ""}</td>
          <td className="table-header comp-val px-1">{mixTotal ? "100   " : ""}</td>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.index} className="h-6.25">
            <td className="table-inner-cell px-2">{row.name}</td>
            <td className="table-inner-cell comp-val px-2 text-right font-mono">
              {row.quantity ?? ""}
            </td>
            <td className="table-inner-cell comp-val px-1">
              {row.quantity && mixTotal
                ? formatCompositionValue((row.quantity / mixTotal) * 100)
                : ""}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
