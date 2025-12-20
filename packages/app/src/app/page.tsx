"use client";

import { ReactGridLayout, useContainerWidth } from "react-grid-layout";

import { useState, useEffect } from "react";

import { fetchValidIngredientNames, IngredientTransfer } from "../lib/data";

import { IngredientRow, makeEmptyIngredientRow, RecipeGrid, RecipeGridProps } from "./recipe";
import { IngredientCompositionGrid } from "./composition";
import { MixPropertiesGrid } from "./properties";
import { MixPropertiesChart } from "./properties-chart";

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
  const h = REACT_GRID_COMPONENT_HEIGHT;

  // prettier-ignore
  const layout = [
    { i: "recipe-0",      x:  0, y: 0, w:  8, h, isResizable: false },
    { i: "properties-0",  x:  8, y: 0, w:  5, h, isResizable: false },
    { i: "composition-0", x: 13, y: 0, w: 11, h, resizeHandles: ["e"] as any, minH: h },
    { i: "chart",         x: 13, y: 1, w: 11, h, resizeHandles: ["e", "s"] as any },

    { i: "recipe-1",      x:  0, y: 1, w:  8, h, isResizable: false },
    { i: "properties-1",  x:  8, y: 1, w:  5, h, isResizable: false },
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
            <div key="chart">{<MixPropertiesChart recipeState={recipes[0]} />}</div>

            <div key="recipe-1">{<RecipeGrid props={recipeGridProps(1)} />}</div>
            <div key="properties-1">{<MixPropertiesGrid recipeState={recipes[1]} />}</div>
          </ReactGridLayout>
        )}
      </div>
    </main>
  );
}
