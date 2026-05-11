"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import {
  ResponsiveGridLayout,
  ResponsiveLayouts,
  useContainerWidth,
  type LayoutItem,
  type ResizeHandleAxis,
} from "react-grid-layout";

import { CompositionBreakdownPanel } from "@/app/_components/composition-breakdown-panel";
import { PropertiesPanel } from "@/app/_components/properties-panel";
import { PropertiesChartPanel } from "@/app/_components/properties-chart-panel";
import { FpdGraphPanel } from "@/app/_components/fpd-graph-panel";
import { makeEmptyRecipeContext } from "@/lib/recipe";
import { RecipeEditorPanel } from "@/app/_components/recipe-editor-panel";
import { useSeededWasmResources } from "@/lib/wasm-resources";
import { REACT_GRID_COMPONENT_HEIGHT, REACT_GRID_ROW_HEIGHT } from "@/lib/styles/sizes";
import { recipeSlotOrDefault } from "@/app/_elements/selects/recipe-select";

/**
 * Main calculator page: responsive drag-and-drop grid of recipe and major display components
 *
 * The layout is defined as a set of breakpoint-specific configurations, which are passed to
 * `ResponsiveGridLayout` to automatically switch between them based on the container width. Most
 * grid items can be resized horizontally and vertically, with some exceptions (e.g. the recipe
 * input grid has a fixed dimension, and the composition grid is only resizable horizontally).
 *
 * On initial load, the calculator checks for a `slot` query parameter in the URL, which indicates
 * the initial recipe index to select in `RecipeEditor`'s `RecipeSelect`; default is 0 ('Recipe').
 *
 * Wrapped by {@link CalculatorPage} so that `useSearchParams` is inside required Suspense boundary
 */
function CalculatorContent() {
  const searchParams = useSearchParams();
  const recipeEditorRecipeIdx = recipeSlotOrDefault(parseInt(searchParams.get("slot") ?? ""));

  const { width, containerRef, mounted } = useContainerWidth();

  const recipeCtxState = useState(() => makeEmptyRecipeContext());
  const [recipeContext] = recipeCtxState;
  const recipes = recipeContext.recipes;

  const wasmResourcesState = useSeededWasmResources();

  const recipeGridProps = {
    recipeCtxState,
    wasmResourcesState,
    initialRecipeIdx: recipeEditorRecipeIdx,
  };

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
          <div key="recipe">{<RecipeEditorPanel props={recipeGridProps} />}</div>
          <div key="properties">{<PropertiesPanel recipes={recipes} />}</div>
          <div key="composition">{<CompositionBreakdownPanel recipes={recipes} />}</div>
          <div key="props-chart">{<PropertiesChartPanel recipes={recipes} />}</div>
          <div key="fpd-graph">{<FpdGraphPanel recipes={recipes} />}</div>
        </ResponsiveGridLayout>
      )}
    </div>
  );
}

/** Wraps {@link CalculatorContent} in a Suspense boundary, required by `useSearchParams` */
export default function CalculatorPage() {
  return (
    <Suspense>
      <CalculatorContent />
    </Suspense>
  );
}
