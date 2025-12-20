"use client";

import { ReactGridLayout, useContainerWidth } from "react-grid-layout";

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

  const cols = Math.floor(width / COLUMN_WIDTH);

  const h = 10.4;

  const make_layout = (component: "recipe" | "properties" | "composition", idx: number) => {
    const i = `${component}-${idx}`;

    // prettier-ignore
    switch (component) {
      case "recipe":      return { i, x:  0, y: idx, w:  8, h: h, isResizable: false };
      case "properties":  return { i, x:  8, y: idx, w:  5, h: h, isResizable: false };
      case "composition": return { i, x: 13, y: idx, w: 11, h: h, resizeHandles: ["e" as any], minH: h };
    }
  };

  const layout = [
    make_layout("recipe", 0),
    make_layout("properties", 0),
    make_layout("composition", 0),
    make_layout("recipe", 1),
    make_layout("properties", 1),
    make_layout("composition", 1),
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
              cols: cols,
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
