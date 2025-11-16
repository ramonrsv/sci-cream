"use client";

import { useState, useEffect } from "react";

import { IngredientRow, makeEmptyIngredientRow, RecipeGrid, RECIPE_TOTAL_ROWS } from "./recipe";
import { IngredientCompositionGrid } from "./ingredient-composition";
import { fetchValidIngredientNames, fetchIngredient } from "../lib/data";
import { constructIngredientFromTransfer } from "../lib/transfer";
import { STATE_VAL, STATE_SET } from "../lib/util";

import {
  Category,
  Composition,
  categoryAsStr,
  getTsEnumNumbers,
  getTsEnumStrings,
  getIngredientExample
} from "@workspace/sci-cream";

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
          const ingredient = getIngredientExample();
          console.log(`Fetched example ingredient from WASM: ${JSON.stringify(ingredient)}`);

          console.log(`Composition: ${JSON.stringify(Composition)}`);
          console.log(`Composition.Milk_SNF: ${Composition.Milk_SNF}`);

          console.log(`categoryAsStr(Category.Dairy): ${categoryAsStr(Category.Dairy)}`);

          console.log("-----------------------------------");
          getTsEnumNumbers(Composition).forEach((val) => {
            const comp = ingredient.composition.get(val);
            if (comp !== undefined) {
              console.log(`${val}: ${comp}`);
            }
          });

          console.log("-----------------------------------");
          ingredient.composition.forEach((value: number, key: number) => {
            console.log(`${key}: ${value}`);
          });

          // console.log(`composition.get(Composition.Milk_SNF): ${ingredient.composition.get(Composition.Milk_SNF.toString())}`);

          // Object.values(Composition).forEach((val) => {
          //   console.log(`${val.toString()}: ${ingredient.composition.get(val.toString())}`);
          // });

          fetchIngredient(row.name)
            .then(ing => ing ? constructIngredientFromTransfer(ing) : undefined)
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
