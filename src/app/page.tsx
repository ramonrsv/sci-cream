"use client";

import { useState } from "react";

interface IngredientRow {
  ingredientName: string;
  quantity: number | null;
}

const TOTAL_ROWS = 22;

function RecipeGrid() {
  const [rows, setRows] = useState<IngredientRow[]>(
    Array.from({ length: TOTAL_ROWS }, () => ({ ingredientName: "", quantity: null }))
  );

  const updateRow = (index: number, field: "ingredientName" | "quantity", value: string) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: field === "quantity" ? parseFloat(value) || null : value };
    setRows(newRows);
  };

  const mixTotal = () => rows.reduce((sum, row) => sum + (row.quantity || 0), 0);

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
            <td className="border-r border-gray-400">
              <input
                type="number"
                value={row.quantity?.toString() || ""}
                onChange={(e) => updateRow(index, "quantity", e.target.value)}
                placeholder=""
                step={1}
                className="table-fillable-input text-right"
              />
            </td>
            <td className="text-sm text-gray-900 text-right px-1">
              {rows[index].quantity && mixTotal() > 0
                ? (rows[index].quantity / mixTotal() * 100).toFixed(1)
                : ""}
            </td>
          </tr>
        ))}
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
