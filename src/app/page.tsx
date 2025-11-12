"use client";

import { useState } from "react";

interface IngredientRow {
  name: string;
  quantity: number | null;
}

const TOTAL_ROWS = 22;
const MAX_RECIPES = 3;

function RecipeGrid(
  { recipeState }:
    { recipeState: [Array<IngredientRow>, React.Dispatch<React.SetStateAction<IngredientRow[]>>] }) {
  const [recipe, setRecipe] = recipeState;

  const updateRecipeRow = (index: number, field: "name" | "quantity", value: string) => {
    const newRecipe = [...recipe];
    newRecipe[index] = { ...newRecipe[index], [field]: field === "quantity" ? parseFloat(value) || null : value };
    setRecipe(newRecipe);
  };

  const mixTotal = () => recipe.reduce((sum, row) => sum + (row.quantity || 0), 0);

  return (
    <table className="border-collapse border-2 border-gray-400">
      {/* Header */}
      <thead>
        <tr className="table-header-footer text-center">
          <th className="py-0.5 w-[325px] border-b-1 border-gray-400 border-r border-gray-300">
            Ingredient</th>
          <th className="py-0.5 w-[60px] border-b-1 border-gray-400 border-r border-gray-300">
            Qty (g)</th>
          <th className="py-0.5 w-[55px] border-b-1 border-gray-400">Qty (%)</th>
        </tr>
        {/* Total Row */}
        <tr className="table-header-footer">
          <td className="py-0.5 text-center px-1 border-b border-gray-400 border-r border-gray-300">
            Total</td>
          <td className="py-0.5 text-right px-3.75 border-b border-gray-400 border-r border-gray-300">
            {mixTotal().toFixed(0)}</td>
          <td className="py-0.5 text-right px-1 border-b border-gray-400">
            {mixTotal() > 0 ? "100.0" : ""}</td>
        </tr>
      </thead>
      <tbody>
        {/* Ingredient Rows */}
        {recipe.map((row, index) => (
          <tr key={index} className="border-b border-gray-300 hover:bg-blue-50 transition-colors">
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

export default function Home() {
  const recipeStates = Array.from({ length: MAX_RECIPES }, () => useState<IngredientRow[]>(
    Array.from({ length: TOTAL_ROWS }, () => ({ name: "", quantity: null }))
  ));

  return (
    <main className="min-h-screen pt-3 pl-8 bg-gray-100">
      <h1 className="text-2xl font-bold pl-8 mb-3 text-gray-900">Ice Cream Recipe Calculator</h1>
      <RecipeGrid recipeState={recipeStates[0]} />
      <RecipeGrid recipeState={recipeStates[1]} />
    </main>
  );
}
