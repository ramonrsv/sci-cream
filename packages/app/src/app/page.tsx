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

// These values are carefully chosen so that the fixed height components (RecipeGrid, IngCompGrid)
// and the grid container heights match exactly, so that there is enough margin after the components
// to accommodate a possible scrollbar, and so that REACT_GRID_COMPONENT_HEIGHT is a whole unit so
// that we can resize components back to their original size (resize is only allowed in whole units)
//
// @todo REACT_GRID_COMPONENT_HEIGHT * REACT_GRID_ROW_HEIGHT != STD_COMPONENT_H_PX; I don't
// understand what's going on here, but I'm sick of trying to get react-grid-layout to behave, so
// leaving it like this for now; it seems to work well, at least on Chrome and on a 1440p display.
const REACT_GRID_COMPONENT_HEIGHT = 11;
const REACT_GRID_ROW_HEIGHT = 35.6;
export const STD_COMPONENT_H_PX = 592;
const REACT_GRID_COLS = 24;

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

  const refsProps = { ctx: recipeCtxState, indices: recipes.slice(1).map((_, idx) => idx + 1) };

  const h = REACT_GRID_COMPONENT_HEIGHT;
  const recipeDims = { w: 8, h, maxW: 8, isResizable: false };
  const propsDims = { w: 6, h, minW: 6, maxW: 8, resizeHandles: ["e", "s"] as RHA[] };
  const compsDims = { w: 10, h, minH: h, resizeHandles: ["e"] as RHA[] };
  const chartDims = { w: 12, h, resizeHandles: ["e", "s"] as RHA[] };
  const graphDims = { w: 12, h, resizeHandles: ["e", "s"] as RHA[] };

  // prettier-ignore
  const layout = [
    { i: "recipe",      x:  0, y:  0, ...recipeDims },
    { i: "properties",  x:  8, y:  0, ...propsDims },
    { i: "composition", x: 14, y:  0, ...compsDims },
    { i: "props-chart", x:  0, y: 11, ...chartDims },
    { i: "fpd-graph",   x: 12, y: 11, ...graphDims },
    { i: "refs",        x:  0, y: 22, ...recipeDims },
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
            gridConfig={{
              cols: REACT_GRID_COLS,
              rowHeight: REACT_GRID_ROW_HEIGHT,
              margin: [20, 20],
            }}
          >
            <div key="recipe">{<RecipeGrid props={{ ctx: recipeCtxState, indices: [0] }} />}</div>
            <div key="properties">{<MixPropertiesGrid recipes={recipes} />}</div>
            <div key="composition">{<IngredientCompositionGrid recipe={recipes[0]} />}</div>
            <div key="props-chart">{<MixPropertiesChart recipes={recipes} />}</div>
            <div key="fpd-graph">{<FpdGraph recipes={recipes} />}</div>
            <div key="refs">{<RecipeGrid props={refsProps} />}</div>
          </ReactGridLayout>
        )}
      </div>
    </main>
  );
}
