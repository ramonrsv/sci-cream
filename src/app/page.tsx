"use client";

import { useState } from "react";

import { IngredientRow, RecipeGrid } from "./recipe";

const TOTAL_ROWS = 22;
const MAX_RECIPES = 3;

export default function Home() {
  const recipes = Array.from({ length: MAX_RECIPES }, () => useState<IngredientRow[]>(
    Array.from({ length: TOTAL_ROWS }, () => ({ name: "", quantity: null }))
  ));

  return (
    <main className="min-h-screen pt-3 pl-8 bg-gray-100">
      <h1 className="text-2xl font-bold pl-8 mb-3 text-gray-900">Ice Cream Recipe Calculator</h1>
      <RecipeGrid recipeState={recipes[0]} />
      <RecipeGrid recipeState={recipes[1]} />
    </main>
  );
}
