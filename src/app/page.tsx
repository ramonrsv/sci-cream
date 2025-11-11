"use client";

import { useState } from "react";

interface IngredientRow {
  ingredientName: string;
  quantity: string;
}

const TOTAL_ROWS = 22;

function RecipeGrid() {
  const [rows, setRows] = useState<IngredientRow[]>(
    Array.from({ length: TOTAL_ROWS }, () => ({ ingredientName: "", quantity: "" }))
  );

  const updateRow = (index: number, field: "ingredientName" | "quantity", value: string) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const mixTotal = rows.reduce((sum, row) => sum + (parseFloat(row.quantity) || 0), 0);

  return (
    <table className="border-collapse border-2 border-gray-400">
      <thead>
        <tr className="table-header-footer text-center">
          <th className="py-0.5 w-[300px] border-b-1 border-gray-400 border-r border-gray-300">
            Ingredient</th>
          <th className="py-0.5 w-[60px] border-b-1 border-gray-400">Qty (g)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} className="border-b border-gray-300 hover:bg-blue-50 transition-colors">
            <td className="border-r border-gray-300">
              <input
                type="text"
                value={row.ingredientName}
                onChange={(e) => updateRow(index, "ingredientName", e.target.value)}
                className="table-fillable-input px-2"
                placeholder=""
              />
            </td>
            <td className="">
              <input
                type="number"
                value={row.quantity}
                onChange={(e) => updateRow(index, "quantity", e.target.value)}
                placeholder=""
                className="table-fillable-input text-right"
              />
            </td>
          </tr>
        ))}

        {/* Total Row */}
        <tr className="table-header-footer">
          <td className="py-0.5 text-right px-1 border-t border-gray-400 border-r border-gray-300">
            Total Weight:</td>
          <td className="py-0.5 text-right border-t border-gray-400">{mixTotal.toFixed(1)} g</td>
        </tr>
      </tbody>
    </table>
  )
}

export default function Home() {


  return (
    <main className="min-h-screen p-8 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4 text-gray-900">Ice Cream Recipe Calculator</h1>
      <RecipeGrid />
    </main>
  );
}
