"use client";

import ReactGridLayout, { useContainerWidth } from "react-grid-layout";

import { useState, useEffect } from "react";

import { IngredientRow, makeEmptyIngredientRow, RecipeGrid, RECIPE_TOTAL_ROWS } from "./recipe";
import { fetchValidIngredientNames, IngredientTransfer } from "../lib/data";

import { IngredientCompositionGrid } from "./composition";
import { MixPropertiesGrid } from "./properties";

const MAX_RECIPES = 2;

export default function Home() {
  const { width, containerRef, mounted } = useContainerWidth();

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

  const COLUMN_WIDTH = 50;
  const ROW_HEIGHT = 50;

  const h = 10.4;

  // prettier-ignore
  const layout = [
    { i: "recipe-0",      x:  0,  y: 0, w:  8, h, isResizable: false },
    { i: "properties-0",  x:  8,  y: 0, w:  5, h, isResizable: false },
    { i: "composition-0", x: 13,  y: 0, w: 11, h, resizeHandles: ["e" as any], minH: h },
    { i: "recipe-1",      x:  0,  y: 1, w:  8, h, isResizable: false },
    { i: "properties-1",  x:  8,  y: 1, w:  5, h, isResizable: false },
    { i: "composition-1", x: 13,  y: 1, w: 11, h, resizeHandles: ["e" as any], minH: h },
  ];

  return (
    <main className="min-h-screen pt-3 pl-8 pr-8 bg-gray-100">
      <h1 className="text-2xl font-bold pl-8 text-gray-900">Ice Cream Recipe Calculator</h1>
      <div ref={containerRef}>
        {mounted && (
          <ReactGridLayout
            layout={layout}
            width={width}
            gridConfig={{
              cols: Math.floor(width / COLUMN_WIDTH),
              rowHeight: ROW_HEIGHT,
              margin: [20, 10],
            }}
          >
            <div key="recipe-0">
              {
                <RecipeGrid
                  recipeState={recipes[0]}
                  validIngredients={validIngredients}
                  ingredientCache={ingredientCache}
                />
              }
            </div>
            <div key="properties-0">{<MixPropertiesGrid recipeState={recipes[0]} />}</div>
            <div key="composition-0">{<IngredientCompositionGrid recipeState={recipes[0]} />}</div>

            <div key="recipe-1">
              {
                <RecipeGrid
                  recipeState={recipes[1]}
                  validIngredients={validIngredients}
                  ingredientCache={ingredientCache}
                />
              }
            </div>
            <div key="properties-1">{<MixPropertiesGrid recipeState={recipes[1]} />}</div>
            <div key="composition-1">{<IngredientCompositionGrid recipeState={recipes[1]} />}</div>
          </ReactGridLayout>
        )}
      </div>
    </main>
  );
}
