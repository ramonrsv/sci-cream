"use client";

import { useState } from "react";

import { Recipe, makeEmptyRecipe, RecipeGrid } from "./recipe";
import { IngredientCompositionGrid } from "./ingredient-composition";

const STATE_RECIPE_IDX = 0;
const MAX_RECIPES = 3;

export default function Home() {
  const recipes = Array.from({ length: MAX_RECIPES }, () => useState<Recipe>(makeEmptyRecipe()));

  return (
    <main className="min-h-screen pt-3 pl-8 pr-8 bg-gray-100">
      <h1 className="text-2xl font-bold pl-8 mb-2 text-gray-900">Ice Cream Recipe Calculator</h1>
      <div className="main-page-grid">
        <RecipeGrid recipeState={recipes[0]} />
        <IngredientCompositionGrid recipe={recipes[0][STATE_RECIPE_IDX]} />
        <RecipeGrid recipeState={recipes[1]} />
        <IngredientCompositionGrid recipe={recipes[1][STATE_RECIPE_IDX]} />
      </div>
    </main>
  );
}
