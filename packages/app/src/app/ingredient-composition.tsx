import { RecipeState } from "./recipe";
import { FlatHeader, flat_header_as_med_str_js } from "@workspace/sci-cream";
import { STATE_VAL, getTsEnumStringKeys } from "../lib/util";

export function IngredientCompositionGrid({
  recipeState,
}: {
  recipeState: RecipeState;
}) {
  const mixTotal = () =>
    recipeState.reduce((sum, [row, _]) => sum + (row.quantity || 0), 0);

  const formattedCompCell = (index: number, header: any) => {
    const ingredient = recipeState[index][STATE_VAL].ingredient;
    if (ingredient && ingredient.composition) {
      const flatRep = ingredient.composition.to_flat_representation_js();
      if (flatRep.has(header)) {
        return Number(flatRep.get(header)!.toFixed(1));
      }
    }
    return "";
  };

  return (
    <div>
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
