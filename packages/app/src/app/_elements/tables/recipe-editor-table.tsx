"use client";

import { Recipe } from "@/app/_components/recipe";
import { formatCompositionValue } from "@/lib/comp-value-format";
import { standardInputStepByPercent } from "@/lib/util";

/**
 * Bare editable recipe table: a 3-column grid (Ingredient | Qty (g) | Qty (%)) with `<input>`
 * fields for the ingredient name and quantity, and a computed percentage cell. Renders every
 * `ingredientRow` in the recipe — including empty rows — so it preserves a fixed shape suitable
 * for direct entry.
 *
 * The caller owns the recipe state and supplies change handlers. The component renders a
 * `<datalist id="valid-ingredients">` for ingredient-name autocomplete.
 */
export function RecipeEditorTable({
  recipe,
  validIngredients,
  hasIngredient,
  onNameChange,
  onQuantityChange,
}: {
  recipe: Recipe;
  validIngredients: string[];
  hasIngredient: (name: string) => boolean;
  onNameChange: (rowIdx: number, name: string) => void;
  onQuantityChange: (rowIdx: number, qtyStr: string) => void;
}) {
  const mixTotal = recipe.mixTotal;

  return (
    <>
      <datalist id="valid-ingredients">
        {validIngredients.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
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
          {/* @todo The ingredient/input rows are not respecting < h-6/[25px]; not sure why yet */}
          {recipe.ingredientRows.map((row) => (
            <tr key={row.index} className="h-6.25">
              <td className="table-inner-cell">
                <input
                  type="search"
                  value={row.name}
                  onChange={(e) => onNameChange(row.index, e.target.value)}
                  className={`table-fillable-input ${
                    row.name === "" || hasIngredient(row.name)
                      ? "focus:ring-blue-400"
                      : "-outline-offset-2 outline-red-400 outline-solid focus:ring-red-400"
                  } w-full px-2`}
                  placeholder=""
                  list="valid-ingredients"
                />
              </td>
              <td className="table-inner-cell">
                <input
                  type="number"
                  value={row.quantity?.toString() || ""}
                  onChange={(e) => onQuantityChange(row.index, e.target.value)}
                  placeholder=""
                  step={standardInputStepByPercent(row.quantity, 2.5, 10)}
                  min={0}
                  className="table-fillable-input w-full text-right font-mono"
                />
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
    </>
  );
}
