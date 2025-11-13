import { Recipe } from "./recipe";
import { Composition } from "../lib/sci-cream/sci-cream";

export function IngredientCompositionGrid({ recipe }: { recipe: Recipe }) {
  const mixTotal = () => recipe.reduce((sum, row) => sum + (row.quantity || 0), 0);

  return (
    <div className="w-[600px] overflow-x-auto whitespace-nowrap border-2 border-gray-400">
      <table className="border-collapse">
        {/* Header */}
        <thead>
          {/* Composition Header */}
          <tr key={0} className="table-header-footer text-center">
            {Object.values(Composition).map((comp: Composition) => (
              <th key={comp} className="py-0.5 px-1 w-fit border-b-1 border-gray-400 border-r border-gray-300">
                {comp}</th>
            ))}
          </tr>
          {/* Totals Row */}
          <tr className="table-header-footer h-6.25">
            {Object.values(Composition).map((comp: Composition) => (
              <td key={comp} className="py-0.5 text-center border-b border-gray-400 border-r border-gray-300">
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Composition Rows */}
          {recipe.map((row, index) => (
            <tr key={index} className="border-b border-gray-300 h-6.25">
              {Object.values(Composition).map((comp: Composition) => (
                <td key={comp} className="text-sm text-gray-900 py-0.5 text-center border-r border-gray-300">
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
