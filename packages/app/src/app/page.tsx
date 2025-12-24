"use client";

import {
  ReactGridLayout,
  useContainerWidth,
  type ResizeHandleAxis as RHA,
} from "react-grid-layout";

import { useState, useEffect } from "react";

import { IngredientTransfer, fetchAllIngredientSpecs } from "../lib/data";

import { ThemeToggle } from "../lib/ui/theme-toggle";
import { RecipeGrid, makeEmptyRecipeContext } from "./recipe";
import { IngredientCompositionGrid } from "./composition";
import { MixPropertiesGrid } from "./properties";
import { MixPropertiesChart } from "./properties-chart";
import { FpdGraph } from "./fpd-graph";

export const MAX_RECIPES = 3;
export const RECIPE_TOTAL_ROWS = 20;

// These values are carefully chosen so that the component and grid container heights match exactly,
// and so that there is enough margin after the components to accommodate a possible scrollbar.
// @todo `pnpm build` fails if these values are exported. Also, importing and using something like
// `h-${STD_COMPONENT_H}` in the component divs className intermittently fails to apply the height
// correctly; need to investigate further. For now, use the `component-h` class in globals.css.
const REACT_GRID_COMPONENT_HEIGHT = 3.6;
const STD_COMPONENT_H = 148; // eslint-disable-line @typescript-eslint/no-unused-vars

export default function Home() {
  const { width, containerRef, mounted } = useContainerWidth();

  const recipeCtxState = useState(() => makeEmptyRecipeContext());
  const [recipeContext, setRecipeContext] = recipeCtxState;
  const recipes = recipeContext.recipes;

  useEffect(() => {
    // Pre-fetch all ingredient specs to populate valid ingredients and cache
    fetchAllIngredientSpecs().then((specs) => {
      const validIngredients: string[] = specs?.map((spec) => spec.name) || [];
      const ingredientCache = new Map<string, IngredientTransfer>(
        specs?.map((spec) => [spec.name, spec]) || [],
      );

      setRecipeContext((prev) => ({ ...prev, validIngredients, ingredientCache }));
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const h = REACT_GRID_COMPONENT_HEIGHT;

  // prettier-ignore
  const layout = [
    { i: "recipe",      x:  0, y: 0, w:  4, h, maxW: 4, isResizable: false },
    { i: "properties",  x:  4, y: 0, w:  3, h, minW: 3, maxW: 4, resizeHandles: ["e", "s"] as RHA[] },
    { i: "composition", x:  7, y: 0, w:  5, h, minH: h, resizeHandles: ["e"] as RHA[] },
    { i: "props-chart", x:  0, y: 1, w:  6, h, resizeHandles: ["e", "s"] as RHA[] },
    { i: "fpd-graph",   x:  6, y: 1, w:  6, h, resizeHandles: ["e", "s"] as RHA[] },
    { i: "refs",        x:  0, y: 2, w:  4, h, isResizable: false },
  ];

  return (
    <main className="min-h-screen pr-8 pl-8">
      <h1 className="pt-5 pb-2 pl-8 text-2xl font-bold">Ice Cream Recipe Calculator</h1>
      <div className="fixed top-5 right-5 z-50">
        <ThemeToggle />
      </div>
      <div ref={containerRef}>
        {mounted && (
          <ReactGridLayout
            layout={layout}
            width={width}
            gridConfig={{ cols: 12, rowHeight: 150, margin: [20, 20] }}
          >
            <div key="recipe">{<RecipeGrid prop={{ ctx: recipeCtxState, indices: [0] }} />}</div>
            <div key="properties">{<MixPropertiesGrid recipes={recipes} />}</div>
            <div key="composition">{<IngredientCompositionGrid recipe={recipes[0]} />}</div>
            <div key="props-chart">{<MixPropertiesChart recipes={recipes} />}</div>
            <div key="fpd-graph">{<FpdGraph recipes={recipes} />}</div>
            <div key="refs">{<RecipeGrid prop={{ ctx: recipeCtxState, indices: [1, 2] }} />}</div>
          </ReactGridLayout>
        )}
      </div>
    </main>
  );
}
