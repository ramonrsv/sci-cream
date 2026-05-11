"use client";

import { IngredientRow, Recipe } from "@/app/_components/recipe";
import { QtyToggle } from "@/app/_elements/selects/qty-toggle-select";
import { applyQtyToggleAndFormat, formatCompositionValue } from "@/lib/comp-value-format";
import { isCompKeyQuantity } from "@/lib/sci-cream/sci-cream";

import { CompKey, comp_key_as_med_str, getWasmEnums } from "@workspace/sci-cream";

/** Returns all `CompKey` values that represent a measurable quantity (excludes ratio properties) */
export function getCompKeys(): CompKey[] {
  // Some values, e.g. ratio properties, aren't very meaningful in a per-ingredient breakdown
  return getWasmEnums(CompKey).filter((key) => isCompKeyQuantity(key));
}

/**
 * Bare presentational breakdown of a recipe's composition.
 *
 * Renders two side-by-side tables: an ingredient/quantity table on the left and a
 * composition-per-ingredient matrix on the right, with a shared totals row at the top. The caller
 * owns the qty-toggle and comp-key selection; the breakdown just renders what it's told.
 */
export function CompositionBreakdown({
  recipe,
  compKeys,
  qtyToggle,
}: {
  recipe: Recipe;
  compKeys: CompKey[];
  qtyToggle: QtyToggle;
}) {
  /** Formats a totals-row cell value for the given comp key, applying the current qtyToggle */
  const formattedTotalCell = (compKey: CompKey) => {
    return applyQtyToggleAndFormat(
      recipe.mixProperties.composition.get(compKey),
      recipe.mixTotal,
      recipe.mixTotal,
      qtyToggle,
      isCompKeyQuantity(compKey),
    );
  };

  /**
   * Formats a per-ingredient composition cell value, applying the current qtyToggle, or returns an
   * empty string if the row has no ingredient or no found composition data for that ingredient.
   */
  const formattedCompCell = (row: IngredientRow, compKey: CompKey) => {
    return row.ingredient && row.ingredient.composition
      ? applyQtyToggleAndFormat(
          row.ingredient.composition.get(compKey),
          row.quantity,
          recipe.mixTotal,
          qtyToggle,
          isCompKeyQuantity(compKey),
        )
      : "";
  };

  return (
    <div className="border-brd-lt dark:border-brd-dk border-r">
      {/* Ingredient & Qty Table */}
      <div id="ing-quantity-table">
        <table className="float-left">
          <thead>
            <tr className="h-6.25">
              <th className="table-header w-fit px-1.25">Ingredient</th>
              <th className="table-header w-fit px-1.25">{`Qty (${qtyToggle == QtyToggle.Percentage ? "%" : "g"})`}</th>
            </tr>
            <tr className="h-6.25">
              <td className="table-header w-fit px-1.25 text-center">Total</td>
              <td className="table-header comp-val w-fit px-1.25">
                {qtyToggle === QtyToggle.Percentage
                  ? "100   "
                  : recipe.mixTotal
                    ? recipe.mixTotal.toFixed(0)
                    : ""}
              </td>
            </tr>
          </thead>
          <tbody>
            {recipe.ingredientRows.map((row) => (
              <tr key={row.index} className="h-6.25">
                <td className="table-inner-cell w-fit px-2">{row.name}</td>
                <td className="table-inner-cell comp-val w-17 px-2">
                  {row.quantity && recipe.mixTotal
                    ? qtyToggle === QtyToggle.Percentage
                      ? formatCompositionValue((row.quantity / recipe.mixTotal) * 100)
                      : row.quantity
                    : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Composition Table */}
      {/* @todo The table doesn't fully align to the right, and its parent's div is ~2px too tall */}
      <div id="ing-composition-table" className="overflow-x-auto whitespace-nowrap">
        <table>
          <thead>
            {/* Composition Header */}
            <tr className="h-6.25">
              {compKeys.map((compKey) => (
                <th key={compKey} className="table-header w-fit px-1 text-center">
                  {comp_key_as_med_str(compKey)}
                </th>
              ))}
            </tr>
            {/* Totals Row */}
            <tr className="h-6.25">
              {compKeys.map((compKey) => (
                <td key={compKey} className="table-header comp-val px-1">
                  {formattedTotalCell(compKey)}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Composition Rows */}
            {recipe.ingredientRows.map((row) => (
              <tr key={row.index} className="h-6.25">
                {compKeys.map((compKey) => (
                  <td key={compKey} className="table-inner-cell comp-val px-1">
                    {formattedCompCell(row, compKey)}
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
