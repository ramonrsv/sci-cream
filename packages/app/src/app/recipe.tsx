import { Ingredient } from "@workspace/sci-cream";
import { STATE_VAL } from "../lib/util";

export const RECIPE_TOTAL_ROWS = 21;

export interface IngredientRow {
  name: string;
  quantity: number | undefined;
  ingredient: Ingredient | undefined;
}

export type IngredientRowState = [
  IngredientRow,
  React.Dispatch<React.SetStateAction<IngredientRow>>
];
export type RecipeState = Array<IngredientRowState>;

export function makeEmptyIngredientRow(): IngredientRow {
  return { name: "", quantity: undefined, ingredient: undefined };
}

export function RecipeGrid({ recipeState }: { recipeState: RecipeState }) {
  const updateIngredientRowName = (index: number, name: string) => {
    const [row, setRow] = recipeState[index];
    setRow({ ...row, name: name });
  };

  const updateIngredientRowQuantity = (index: number, quantityStr: string) => {
    const [row, setRow] = recipeState[index];
    const quantity = quantityStr === "" ? undefined : parseFloat(quantityStr);
    setRow({ ...row, quantity: quantity });
  };

  const getMixTotal = () => recipeState.reduce((sum, [row, _]) => sum + (row.quantity || 0), 0);

  return (
    <table className="mt-6 border-collapse border-gray-400 border-2">
      {/* Header */}
      <thead>
        <tr className="table-header h-[25px] text-center">
          <th className="border-gray-400 border-r w-[325px] min-w-[250px]">Ingredient</th>
          <th className="border-gray-400 border-r w-[60px] min-w-[60px]">Qty (g)</th>
          <th className="w-[55px] min-w-[55px]">Qty (%)</th>
        </tr>
        {/* Total Row */}
        <tr className="table-header h-[25px]">
          <td className="px-1 border-gray-400 border-r text-center">Total</td>
          <td className="px-3.75 border-gray-400 border-r text-right">
            {getMixTotal().toFixed(0)}
          </td>
          <td className="px-1 text-right">{getMixTotal() > 0 ? "100.0" : ""}</td>
        </tr>
      </thead>
      <tbody>
        {/* Ingredient Rows */}
        {/* @todo The ingredient/input rows are not respecting < h-6/[25px]; not sure why yet */}
        {recipeState.map(([row, _], index) => (
          <tr key={index} className="table-inner-cell h-[25px] hover:bg-blue-50 transition-colors">
            <td className="border-gray-300 border-r">
              <input
                type="text"
                value={row.name}
                onChange={(e) => updateIngredientRowName(index, e.target.value)}
                className="table-fillable-input px-2"
                placeholder=""
              />
            </td>
            <td className="border-gray-300 border-r">
              <input
                type="number"
                value={row.quantity?.toString() || ""}
                onChange={(e) => updateIngredientRowQuantity(index, e.target.value)}
                placeholder=""
                step={1}
                className="table-fillable-input text-right"
              />
            </td>
            <td className="px-1 text-gray-900 text-sm text-right ">
              {recipeState[index][STATE_VAL].quantity && getMixTotal() > 0
                ? ((recipeState[index][STATE_VAL].quantity / getMixTotal()) * 100).toFixed(1)
                : ""}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
