"use client";

import { useState, useEffect } from "react";

import { Recipe, makeEmptyRecipe, RecipeGrid, RECIPE_TOTAL_ROWS } from "./recipe";
import { IngredientCompositionGrid } from "./ingredient-composition";
import { fetchRecipeIngredients } from "@/lib/data";
import { constructIngredientFromTransfer } from "@/lib/transfer";
import { Ingredient } from "@/lib/sci-cream/sci-cream";

const VAL = 0;
const SET = 1;

const MAX_RECIPES = 3;

export default function Home() {
  const recipes = Array.from({ length: MAX_RECIPES }, () => useState<Recipe>(makeEmptyRecipe()));
  const ingredients = Array.from({ length: MAX_RECIPES },
    () => useState<(Ingredient | undefined)[]>(Array.from({ length: RECIPE_TOTAL_ROWS }, () => undefined)));

  for (let i = 0; i < MAX_RECIPES; i++) {
    useEffect(() => {
      const ingredientNames = recipes[i][VAL].map(row => row.name);

      fetchRecipeIngredients(ingredientNames).then(result =>
        ingredients[i][SET](result.map((ing) => ing ? constructIngredientFromTransfer(ing) : undefined)))
    }, recipes[i][VAL]);
  }

  return (
    <main className="min-h-screen pt-3 pl-8 pr-8 bg-gray-100">
      <h1 className="text-2xl font-bold pl-8 mb-2 text-gray-900">Ice Cream Recipe Calculator</h1>
      <div className="main-page-grid">
        <RecipeGrid recipeState={recipes[0]} />
        <IngredientCompositionGrid recipe={recipes[0][VAL]} ingredients={ingredients[0][VAL]} />
        <RecipeGrid recipeState={recipes[1]} />
        <IngredientCompositionGrid recipe={recipes[1][VAL]} ingredients={ingredients[1][VAL]} />
      </div>
    </main>
  );
}
