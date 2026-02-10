"use client";

import {
  ResponsiveGridLayout,
  ResponsiveLayouts,
  useContainerWidth,
  type LayoutItem,
  type ResizeHandleAxis,
} from "react-grid-layout";

import { useState, useEffect } from "react";

import { fetchAllIngredientSpecs } from "../lib/data";

import {
  Bridge as WasmBridge,
  new_ingredient_database_seeded_from_specs,
} from "@workspace/sci-cream";

import { ThemeSelect, Theme, getInitialTheme } from "../lib/ui/theme-select";
import { RecipeGrid, makeEmptyRecipeContext, makeEmptyRecipeResources } from "./recipe";
import { IngredientCompositionGrid } from "./composition";
import { MixPropertiesGrid } from "./properties";
import { MixPropertiesChart } from "./properties-chart";
import { FpdGraph } from "./fpd-graph";

export const MAX_RECIPES = 3;
export const RECIPE_TOTAL_ROWS = 20;

export const DRAG_HANDLE_ICON_SIZE = 17;
export const COMPONENT_ACTION_ICON_SIZE = 20;
export const GRAPH_TITLE_FONT_SIZE = 15;

// These values are carefully chosen so that the fixed height components (RecipeGrid, IngCompGrid)
// and the grid container heights match exactly, so that there is enough margin after the components
// to accommodate a possible scrollbar, and so that REACT_GRID_COMPONENT_HEIGHT is a whole unit so
// that we can resize components back to their original size (resize is only allowed in whole units)
//
// @todo REACT_GRID_COMPONENT_HEIGHT * REACT_GRID_ROW_HEIGHT != STD_COMPONENT_H_PX; I don't
// understand what's going on here, but I'm sick of trying to get react-grid-layout to behave, so
// leaving it like this for now; it seems to work well, at least on Chrome and on a 1440p display.
const REACT_GRID_COMPONENT_HEIGHT = 11;
const REACT_GRID_ROW_HEIGHT = 36;
export const STD_COMPONENT_H_PX = 596;

export default function Home() {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());
  const { width, containerRef, mounted } = useContainerWidth();

  const recipeCtxState = useState(() => makeEmptyRecipeContext());
  const [recipeContext] = recipeCtxState;
  const recipes = recipeContext.recipes;

  const recipeResourcesState = useState(() => makeEmptyRecipeResources());
  const [, setRecipeResources] = recipeResourcesState;

  useEffect(() => {
    // Pre-fetch all ingredient specs to populate valid ingredients and WASM bridge database
    fetchAllIngredientSpecs().then(async (specs) => {
      const validIngredients: string[] = specs?.map((spec) => spec.name) || [];
      const wasmBridge = new WasmBridge(
        new_ingredient_database_seeded_from_specs(specs?.map((spec) => spec.spec) || []),
      );

      setRecipeResources({ validIngredients, wasmBridge });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const recipeGridProps = { recipeCtxState, recipeResourcesState };

  // 2160p: 3840px, /2 = 1920px
  // 1440p: 2560px, /2 = 1280px
  // 1080p: 1920px, /2 =  960px
  const breakpoints = { xl: 2080, lg: 1600, md: 1120, sm: 720, xs: 0 };
  const cols = { xl: 32, lg: 24, md: 16, sm: 12, xs: 8 };

  const h = REACT_GRID_COMPONENT_HEIGHT;
  const fullW = (bp: keyof typeof cols) => cols[bp];

  const horiz = ["e", "w"] as ResizeHandleAxis[];
  const horizVert = ["e", "w", "s"] as ResizeHandleAxis[];

  // prettier-ignore
  const base = {
    "recipe":      { i: "recipe",      h, isResizable: false },
    "properties":  { i: "properties",  h, resizeHandles: horizVert, minW: 4 },
    "composition": { i: "composition", h, resizeHandles: horiz, minW: 5 },
    "props-chart": { i: "props-chart", h, resizeHandles: horizVert },
    "fpd-graph":   { i: "fpd-graph",   h, resizeHandles: horizVert },
  };

  const update = (i: keyof typeof base, updates: Partial<LayoutItem>): LayoutItem => {
    return { ...base[i], ...updates } as LayoutItem;
  };

  // prettier-ignore
  const xlLayout: LayoutItem[] = [
    update("properties",  { x:  0, y:  0, w:  5, h: h * 2 }),
    update("recipe",      { x:  5, y:  0, w:  6 }),
    update("props-chart", { x: 11, y:  0, w: 11 }),
    update("fpd-graph",   { x: 22, y:  0, w: 10 }),
    update("composition", { x:  5, y:  h, w: 27 }),
  ];

  // prettier-ignore
  const lgLayout: LayoutItem[] = [
    update("properties",  { x:  0, y:  0, w:  5, h: h * 2 }),
    update("recipe",      { x:  5, y:  0, w:  5 }),
    update("props-chart", { x: 10, y:  0, w:  7 }),
    update("fpd-graph",   { x: 17, y:  0, w:  7 }),
    update("composition", { x:  5, y:  h, w: 19 }),
  ];

  // prettier-ignore
  const mdLayout: LayoutItem[] = [
    update("properties",  { x:  0, y:  0, w:  5 }),
    update("recipe",      { x:  5, y:  0, w:  5 }),
    update("composition", { x: 10, y:  0, w:  6 }),
    update("props-chart", { x:  0, y:  h, w:  8 }),
    update("fpd-graph",   { x:  8, y:  h, w:  8 }),
  ];

  // prettier-ignore
  const smLayout: LayoutItem[] = [
    update("properties",  { x:  0, y:     0, w:  6 }),
    update("recipe",      { x:  6, y:     0, w:  6 }),
    update("composition", { x:  0, y: h * 1, w: fullW("sm") }),
    update("props-chart", { x:  0, y: h * 2, w: fullW("sm") }),
    update("fpd-graph",   { x:  0, y: h * 3, w: fullW("sm") }),
  ];

  const xsLayout: LayoutItem[] = Object.values(base).map((item, idx) =>
    update(item.i as keyof typeof base, { x: 0, y: idx * h, w: fullW("xs") }),
  );

  const layouts: ResponsiveLayouts = {
    xl: xlLayout,
    lg: lgLayout,
    md: mdLayout,
    sm: smLayout,
    xs: xsLayout,
  };

  return (
    <main className="min-h-screen">
      <h1 className="pt-4 pl-8 text-2xl font-bold">Ice Cream Recipe Calculator</h1>
      <div className="fixed top-4 right-5 z-50">
        <ThemeSelect themeState={[theme, setTheme]} />
      </div>
      <div ref={containerRef}>
        {mounted && (
          <ResponsiveGridLayout
            breakpoints={breakpoints}
            width={width}
            cols={cols}
            layouts={layouts}
            rowHeight={REACT_GRID_ROW_HEIGHT}
            margin={[20, 20]}
            dragConfig={{ handle: ".drag-handle" }}
          >
            <div key="recipe">{<RecipeGrid props={recipeGridProps} />}</div>
            <div key="properties">{<MixPropertiesGrid recipes={recipes} />}</div>
            <div key="composition">{<IngredientCompositionGrid recipes={recipes} />}</div>
            <div key="props-chart">{<MixPropertiesChart recipes={recipes} theme={theme} />}</div>
            <div key="fpd-graph">{<FpdGraph recipes={recipes} theme={theme} />}</div>
          </ResponsiveGridLayout>
        )}
      </div>
    </main>
  );
}
