import { Ingredient } from "@/lib/sci-cream/sci-cream";

export const RECIPE_TOTAL_ROWS = 22;

interface IngredientRow {
  name: string;
  quantity: number | undefined;
}

export type Recipe = Array<IngredientRow>;
export type RecipeState = [Recipe, React.Dispatch<React.SetStateAction<Recipe>>];

export function makeEmptyRecipe(): Recipe {
  return Array.from({ length: RECIPE_TOTAL_ROWS }, () => ({ name: "", quantity: undefined }));
}
export function RecipeGrid({ recipeState }: { recipeState: RecipeState }) {
  const [recipe, setRecipe] = recipeState;

  const updateRecipeRow = (index: number, field: "name" | "quantity", value: string) => {
    const newRecipe = [...recipe];
    newRecipe[index] = {
      ...newRecipe[index],
      [field]: (field === "quantity") ? (parseFloat(value) || undefined) : value
    };
    setRecipe(newRecipe);
  };

  const mixTotal = () => recipe.reduce((sum, row) => sum + (row.quantity || 0), 0);

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
        {recipe.map((row, index) => (
          <tr key={index} className="h-6 border-b border-gray-300 hover:bg-blue-50 transition-colors">
            <td className="border-r border-gray-300">
              <input
                type="text"
                value={row.name}
                onChange={(e) => updateRecipeRow(index, "name", e.target.value)}
                className="table-fillable-input px-2"
                placeholder=""
              />
            </td>
            <td className="border-r border-gray-400">
              <input
                type="number"
                value={row.quantity?.toString() || ""}
                onChange={(e) => updateRecipeRow(index, "quantity", e.target.value)}
                placeholder=""
                step={1}
                className="table-fillable-input text-right"
              />
            </td>
            <td className="text-sm text-gray-900 text-right px-1">
              {recipe[index].quantity && mixTotal() > 0
                ? (recipe[index].quantity / mixTotal() * 100).toFixed(1)
                : ""}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
