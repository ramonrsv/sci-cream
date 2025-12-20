"use client";

import { ReactGridLayout, useContainerWidth } from "react-grid-layout";

import { useState, useEffect } from "react";

import { fetchValidIngredientNames, IngredientTransfer } from "../lib/data";

import { IngredientRow, makeEmptyIngredientRow, RecipeGrid, RecipeGridProps } from "./recipe";
import { IngredientCompositionGrid } from "./composition";
import { MixPropertiesGrid } from "./properties";

const MAX_RECIPES = 2;
const RECIPE_TOTAL_ROWS = 21;

// These values are carefully chosen so that the component and grid container heights match exactly,
// and so that there is enough margin after the components to accommodate a possible scrollbar.
// @todo `pnpm build` fails if these values are exported. Also, importing and using something like
// `h-[${COMPONENT_H_PX}px]` in the component divs intermittently fails to apply the height
// correctly; need to investigate further. For now, use the `component-h` class in globals.css.
const REACT_GRID_COMPONENT_HEIGHT = 10.4;
const COMPONENT_H_PX = 615;

export default function Home() {
  const { width, containerRef, mounted } = useContainerWidth();

  const [validIngredients, setValidIngredients] = useState<string[]>([]);
  const ingredientCacheState = useState<Map<string, IngredientTransfer>>(new Map());

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

  const make_layout = (component: "recipe" | "properties" | "composition", idx: number) => {
    const i = `${component}-${idx}`;
    const h = REACT_GRID_COMPONENT_HEIGHT;

    // prettier-ignore
    switch (component) {
      case "recipe":      return { i, x:  0, y: idx, w:  8, h, isResizable: false };
      case "properties":  return { i, x:  8, y: idx, w:  5, h, isResizable: false };
      case "composition": return { i, x: 13, y: idx, w: 11, h, resizeHandles: ["e" as any], minH: h };
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

  const recipeGridProps = (recipe_idx: number): RecipeGridProps => {
    return {
      recipeState: recipes[recipe_idx],
      validIngredients: validIngredients,
      ingredientCacheState: ingredientCacheState,
    };
  };

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
            <div key="recipe-0">{<RecipeGrid props={recipeGridProps(0)} />}</div>
            <div key="properties-0">{<MixPropertiesGrid recipeState={recipes[0]} />}</div>
            <div key="composition-0">{<IngredientCompositionGrid recipeState={recipes[0]} />}</div>

            <div key="recipe-1">{<RecipeGrid props={recipeGridProps(1)} />}</div>
            <div key="properties-1">{<MixPropertiesGrid recipeState={recipes[1]} />}</div>
            <div key="composition-1">{<IngredientCompositionGrid recipeState={recipes[1]} />}</div>
          </ReactGridLayout>
        )}
      </div>
    </main>
  );
}
