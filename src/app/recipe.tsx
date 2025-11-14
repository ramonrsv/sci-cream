import { Ingredient } from "@/lib/deprecated/sci-cream";
import { STATE_VAL } from "@/lib/util";

export const RECIPE_TOTAL_ROWS = 22;

export interface IngredientRow {
  name: string;
  quantity: number | undefined;
  ingredient: Ingredient | undefined;
}

export type IngredientRowState = [IngredientRow, React.Dispatch<React.SetStateAction<IngredientRow>>];
export type RecipeState = Array<IngredientRowState>;

export function makeEmptyIngredientRow(): IngredientRow {
  return { name: "", quantity: undefined, ingredient: undefined };
}

export function RecipeGrid({ recipeState }: { recipeState: RecipeState }) {
  const updateIngredientRowName = (index: number, name: string) => {
    const [row, setRow] = recipeState[index];
    setRow({ ...row, name: name });
  }

  const updateIngredientRowQuantity = (index: number, quantityStr: string) => {
    const [row, setRow] = recipeState[index];
    const quantity = quantityStr === "" ? undefined : parseFloat(quantityStr);
    setRow({ ...row, quantity: quantity });
  }

  const mixTotal = () => recipeState.reduce((sum, [row, _]) => sum + (row.quantity || 0), 0);

  return (
    <table className="border-collapse border-2 border-gray-400">
      {/* Header */}
      <thead>
        <tr className="h-6 table-header-footer text-center">
          <th className="w-[325px] min-w-[250px] border-b-1 border-gray-400 border-r border-gray-300">
            Ingredient</th>
          <th className="w-[60px] min-w-[60px] border-b-1 border-gray-400 border-r border-gray-300">
            Qty (g)</th>
          <th className="w-[55px] min-w-[55px] border-b-1 border-gray-400">Qty (%)</th>
        </tr>
        {/* Total Row */}
        <tr className="h-6 table-header-footer">
          <td className="text-center px-1 border-b border-gray-400 border-r border-gray-300">
            Total</td>
          <td className="text-right px-3.75 border-b border-gray-400 border-r border-gray-300">
            {mixTotal().toFixed(0)}</td>
          <td className="text-right px-1 border-b border-gray-400">
            {mixTotal() > 0 ? "100.0" : ""}</td>
        </tr>
      </thead>
      <tbody>
        {/* Ingredient Rows */}
        {/* @todo The ingredient/input rows are not respecting the h-6 class; not sure why yet */}
        {recipeState.map(([row, _], index) => (
          <tr key={index} className="h-6 border-b border-gray-300 hover:bg-blue-50 transition-colors">
            <td className="border-r border-gray-300">
              <input
                type="text"
                value={row.name}
                onChange={(e) => updateIngredientRowName(index, e.target.value)}
                className="table-fillable-input px-2"
                placeholder=""
              />
            </td>
            <td className="border-r border-gray-400">
              <input
                type="number"
                value={row.quantity?.toString() || ""}
                onChange={(e) => updateIngredientRowQuantity(index, e.target.value)}
                placeholder=""
                step={1}
                className="table-fillable-input text-right"
              />
            </td>
            <td className="text-sm text-gray-900 text-right px-1">
              {recipeState[index][STATE_VAL].quantity && mixTotal() > 0
                ? (recipeState[index][STATE_VAL].quantity / mixTotal() * 100).toFixed(1)
                : ""}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
