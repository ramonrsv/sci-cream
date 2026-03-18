"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  ResponsiveGridLayout,
  ResponsiveLayouts,
  useContainerWidth,
  type LayoutItem,
  type ResizeHandleAxis,
} from "react-grid-layout";

import { IngredientCompositionGrid } from "@/app/_components/composition";
import { MixPropertiesGrid } from "@/app/_components/properties";
import { MixPropertiesChart } from "@/app/_components/properties-chart";
import { FpdGraph } from "@/app/_components/fpd-graph";
import {
  RecipeGrid,
  makeEmptyRecipeContext,
  makeRecipeResourcesFromEmbeddedData,
} from "@/app/_components/recipe";

import { fetchAllUserIngredientSpecs } from "@/lib/data";
import { REACT_GRID_COMPONENT_HEIGHT, REACT_GRID_ROW_HEIGHT } from "@/lib/styles/sizes";

/**
 * Main calculator page: responsive drag-and-drop grid of recipe and major display components
 *
 * The layout is defined as a set of breakpoint-specific configurations, which are passed to
 * `ResponsiveGridLayout` to automatically switch between them based on the container width. Most
 * grid items can be resized horizontally and vertically, with some exceptions (e.g. the recipe
 * input grid has a fixed dimension, and the composition grid is only resizable horizontally).
 */
export default function CalculatorPage() {
  const { data: session } = useSession();

  const { width, containerRef, mounted } = useContainerWidth();

  const recipeCtxState = useState(() => makeEmptyRecipeContext());
  const [recipeContext] = recipeCtxState;
  const recipes = recipeContext.recipes;

  const recipeResourcesState = useState(() => makeRecipeResourcesFromEmbeddedData());
  const [recipeResources, setRecipeResources] = recipeResourcesState;

  useEffect(() => {
    // On initial load, fetch and seed the WASM bridge with any user-defined ingredient specs
    // associated with the logged-in user, if any, then trigger a re-render to propagate the updated
    // bridge to all components that depends on it, which should produce a `MixProperties` update.
    if (session?.user?.email) {
      fetchAllUserIngredientSpecs(session.user.email).then(async (userSpecs) => {
        recipeResources.wasmBridge.seed_from_specs((userSpecs ?? []).map((s) => s.spec));
        setRecipeResources((prev) => ({ ...prev, updateIdx: prev.updateIdx + 1 }));
      });
    }
  }, [session?.user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const recipeGridProps = { recipeCtxState, recipeResourcesState };

  // 2160p: 3840px, /2 = 1920px
  // 1440p: 2560px, /2 = 1280px
  // 1080p: 1920px, /2 =  960px

  /** Pixel-width breakpoints for the responsive grid layout */
  const breakpoints = { xl: 2080, lg: 1600, md: 1120, sm: 720, xs: 0 };

  /** Number of grid columns at each breakpoint */
  const cols = { xl: 32, lg: 24, md: 16, sm: 12, xs: 8 };

  const h = REACT_GRID_COMPONENT_HEIGHT;
  const fullW = (bp: keyof typeof cols) => cols[bp];

  const horiz = ["e", "w"] as ResizeHandleAxis[];
  const horizVert = ["e", "w", "s"] as ResizeHandleAxis[];

  /** Base layout item configuration shared across all breakpoint layouts */
  // prettier-ignore
  const base = {
    "recipe":      { i: "recipe",      h, isResizable: false },
    "properties":  { i: "properties",  h, resizeHandles: horizVert, minW: 4 },
    "composition": { i: "composition", h, resizeHandles: horiz, minW: 5 },
    "props-chart": { i: "props-chart", h, resizeHandles: horizVert },
    "fpd-graph":   { i: "fpd-graph",   h, resizeHandles: horizVert },
  };

  /** Merge override properties into a base layout item, producing a fully-typed `LayoutItem` */
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
    <div ref={containerRef} className="pr-4">
      {mounted && (
        <ResponsiveGridLayout
          breakpoints={breakpoints}
          width={width}
          cols={cols}
          layouts={layouts}
          rowHeight={REACT_GRID_ROW_HEIGHT}
          margin={[20, 20]}
          containerPadding={[0, 0]}
          dragConfig={{ handle: ".drag-handle" }}
        >
          <div key="recipe">{<RecipeGrid props={recipeGridProps} />}</div>
          <div key="properties">{<MixPropertiesGrid recipes={recipes} />}</div>
          <div key="composition">{<IngredientCompositionGrid recipes={recipes} />}</div>
          <div key="props-chart">{<MixPropertiesChart recipes={recipes} />}</div>
          <div key="fpd-graph">{<FpdGraph recipes={recipes} />}</div>
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
