"use client";

import { RecipeSummary } from "@/app/_components/recipe";
import { QtyToggle } from "@/app/_elements/selects/qty-toggle-select";
import { applyQtyToggleAndFormat } from "@/lib/comp-value-format";
import { isPropKeyQuantity } from "@/lib/sci-cream/sci-cream";

import { PropKey, MixProperties, getMixProperty, prop_key_as_med_str } from "@workspace/sci-cream";

/**
 * Bare presentational table showing mix property values across one or more recipes.
 *
 * Columns are the provided recipes (header: `recipe.id`), rows are the provided `propKeys`. The
 * caller owns recipe/key filtering, toolbar state, and any scroll/size chrome.
 */
export function PropertiesTable({
  recipes,
  propKeys,
  qtyToggle,
}: {
  recipes: RecipeSummary[];
  propKeys: PropKey[];
  qtyToggle: QtyToggle;
}) {
  const formattedCell = (propKey: PropKey, mixProperties: MixProperties, mixTotal: number) => {
    return applyQtyToggleAndFormat(
      getMixProperty(mixProperties, propKey),
      mixTotal,
      mixTotal,
      qtyToggle,
      isPropKeyQuantity(propKey),
    );
  };

  return (
    <table>
      <thead>
        <tr className="h-6.25">
          <th className="table-header w-full px-1.25">Property</th>
          {recipes.map((recipe) => (
            <th key={recipe.id} className="table-header px-1.25 text-center">
              {recipe.id}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {propKeys.map((propKey) => (
          <tr key={String(propKey)} className="h-6.25">
            <td className="table-header w-full px-1.25 text-center">
              {prop_key_as_med_str(propKey)}
            </td>
            {recipes.map((recipe) => (
              <td key={recipe.id} className="table-inner-cell comp-val px-1.25">
                {formattedCell(propKey, recipe.mixProperties, recipe.mixTotal!)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
