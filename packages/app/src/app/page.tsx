"use client";

import { useState, useEffect } from "react";

import { IngredientRow, makeEmptyIngredientRow, RecipeGrid, RECIPE_TOTAL_ROWS } from "./recipe";
import { fetchValidIngredientNames, IngredientTransfer } from "../lib/data";

import { IngredientCompositionGrid } from "./composition";
import { MixPropertiesGrid } from "./properties";

const MAX_RECIPES = 2;

export default function Home() {
  const [validIngredients, setValidIngredients] = useState<string[]>([]);
  const ingredientCache = useState<Map<string, IngredientTransfer>>(new Map());

  const recipes = Array.from({ length: MAX_RECIPES }, () =>
    Array.from({ length: RECIPE_TOTAL_ROWS }, () =>
      useState<IngredientRow>(makeEmptyIngredientRow())
    )
  );

  useEffect(() => {
    fetchValidIngredientNames().then((names) => setValidIngredients(names));
  }, []);

  return (
    <main className="min-h-screen pt-3 pl-8 pr-8 bg-gray-100">
      <h1 className="text-2xl font-bold pl-8 mb-2 text-gray-900">Ice Cream Recipe Calculator</h1>
      <div className="main-page-grid">
        <RecipeGrid
          recipeState={recipes[0]}
          validIngredients={validIngredients}
          ingredientCache={ingredientCache}
        />
        <MixPropertiesGrid recipeState={recipes[0]} />
        <IngredientCompositionGrid recipeState={recipes[0]} />
        <RecipeGrid
          recipeState={recipes[1]}
          validIngredients={validIngredients}
          ingredientCache={ingredientCache}
        />
        <MixPropertiesGrid recipeState={recipes[1]} />
        <IngredientCompositionGrid recipeState={recipes[1]} />
      </div>
    </main>
  );
}
