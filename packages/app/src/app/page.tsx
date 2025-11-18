"use client";

import { useState, useEffect } from "react";

import { IngredientRow, makeEmptyIngredientRow, RecipeGrid, RECIPE_TOTAL_ROWS } from "./recipe";
import { IngredientCompositionGrid } from "./ingredient-composition";
import { fetchValidIngredientNames, fetchIngredientSpec } from "../lib/data";
import { STATE_VAL, STATE_SET } from "../lib/util";

import { into_ingredient_from_spec_js } from "@workspace/sci-cream";

const MAX_RECIPES = 2;

export default function Home() {
  const validIngredients = useState<string[]>([]);

  const recipes = Array.from({ length: MAX_RECIPES },
    () => Array.from({ length: RECIPE_TOTAL_ROWS }, () => useState<IngredientRow>(makeEmptyIngredientRow())));

  useEffect(() => {
    fetchValidIngredientNames().then(names => validIngredients[STATE_SET](names));
  }, []);

  recipes.forEach((recipeRows, _) => {
    recipeRows.forEach((rowState, _) => {
      const [row, setRow] = rowState;

      useEffect(() => {
        if (row.name !== "" && validIngredients[STATE_VAL].includes(row.name)) {
          fetchIngredientSpec(row.name)
            .then(spec => spec ? into_ingredient_from_spec_js(spec.spec) : undefined)
            .then(ing => setRow({ ...row, ingredient: ing }));
        } else {
          setRow({ ...row, ingredient: undefined });
        }
      }, [row.name, validIngredients[STATE_VAL]]);

    })
  });

  return (
    <main className="min-h-screen pt-3 pl-8 pr-8 bg-gray-100">
      <h1 className="text-2xl font-bold pl-8 mb-2 text-gray-900">Ice Cream Recipe Calculator</h1>
      <div className="main-page-grid">
        <RecipeGrid recipeState={recipes[0]} />
        <IngredientCompositionGrid recipeState={recipes[0]} />
        <RecipeGrid recipeState={recipes[1]} />
        <IngredientCompositionGrid recipeState={recipes[1]} />
      </div>
    </main>
  );
}
