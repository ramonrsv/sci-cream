import { Recipe } from "./recipe";
import { Composition, Ingredient } from "../lib/sci-cream/sci-cream";

export function IngredientCompositionGrid({
  recipe,
  ingredients
}: {
  recipe: Recipe;
  ingredients: (Ingredient | undefined)[];
}) {
  const mixTotal = () => recipe.reduce((sum, row) => sum + (row.quantity || 0), 0);

  const formattedCompCell = (index: number, comp: Composition) => {
    return (ingredients[index] && ingredients[index].composition[comp]) ?
      Number(ingredients[index].composition[comp].toFixed(2)) : "";
  }

  return (
    <div className="w-full min-w-[400px] overflow-x-auto whitespace-nowrap border-2 border-gray-400">
      <table className="border-collapse">
        {/* Header */}
        <thead>
          {/* Composition Header */}
          <tr key={0} className="h-6 table-header-footer text-center">
            {Object.values(Composition).map((comp: Composition) => (
              <th key={comp} className="px-1 w-fit border-b-1 border-gray-400 border-r border-gray-300">
                {comp}</th>
            ))}
          </tr>
          {/* Totals Row */}
          <tr className="h-6 table-header-footer">
            {Object.values(Composition).map((comp: Composition) => (
              <td key={comp} className="text-center border-b border-gray-400 border-r border-gray-300">
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Composition Rows */}
          {/* @todo Using h-6.25 instead of h-6 because I can't make RecipeGrid ingredient rows
          respect the h-* value. This value makes the rows between the two grids line up */}
          {recipe.map((_, index) => (
            <tr key={index} className="h-6.25 border-b border-gray-300">
              {Object.values(Composition).map((comp: Composition) => (
                <td key={comp} className="text-sm text-gray-900 text-center border-r border-gray-300">
                  {formattedCompCell(index, comp)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
