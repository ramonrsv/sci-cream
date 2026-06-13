"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import {
  ResponsiveGridLayout,
  ResponsiveLayouts,
  useContainerWidth,
  type Layout,
  type LayoutItem,
  type ResizeHandleAxis,
} from "react-grid-layout";
import type { LightRecipe } from "@workspace/sci-cream";

import { CompositionBreakdownPanel } from "@/app/_components/composition-breakdown-panel";
import { PropertiesPanel } from "@/app/_components/properties-panel";
import { PropertiesChartPanel } from "@/app/_components/properties-chart-panel";
import { FpdGraphPanel } from "@/app/_components/fpd-graph-panel";
import { WatchersPanel } from "@/app/_components/watchers-panel";
import {
  makeBalancedRecipeUpdates,
  makeEmptyRecipeContext,
  makeUpdatedRecipe,
  makeUpdatedRecipeContext,
} from "@/lib/recipe";
import { RecipeEditorPanel } from "@/app/_components/recipe-editor-panel";
import { useSeededWasmResources } from "@/lib/wasm-resources";
import { REACT_GRID_COMPONENT_HEIGHT, REACT_GRID_ROW_HEIGHT } from "@/lib/styles/sizes";
import { recipeSlotOrDefault } from "@/app/_elements/selects/recipe-select";
import { loadStoredLayouts, onLayoutReset, saveLayouts } from "@/lib/calculator-layout";

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
  const [recipeContext, setRecipeContext] = recipeCtxState;
  const recipes = recipeContext.recipes;

  const wasmResourcesState = useSeededWasmResources();
  const [wasmResources] = wasmResourcesState;

  const recipeGridProps = {
    recipeCtxState,
    wasmResourcesState,
    initialRecipeIdx: recipeEditorRecipeIdx,
  };

  /** Apply a balanced light recipe (from `Bridge.balance_recipe`) onto the main recipe (slot 0) */
  const onApplyBalancedMain = (balanced: LightRecipe) => {
    const current = recipeContext.recipes[0];
    const updates = makeBalancedRecipeUpdates(current, balanced, wasmResources.hasIngredient);
    const updated = makeUpdatedRecipe(current, updates, wasmResources);
    setRecipeContext((prev) => makeUpdatedRecipeContext(prev, [updated]));
  };

  const watchersPanelProps = { recipes, wasmBridge: wasmResources.wasmBridge, onApplyBalancedMain };

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
    "recipe":      { i: "recipe",      h, resizeHandles: horiz, minW: 5 },
    "watchers":    { i: "watchers",    h, resizeHandles: horizVert, minW: 4 },
    "props-chart": { i: "props-chart", h, resizeHandles: horizVert },
    "properties":  { i: "properties",  h, resizeHandles: horizVert, minW: 4 },
    "fpd-graph":   { i: "fpd-graph",   h, resizeHandles: horizVert },
    "composition": { i: "composition", h, resizeHandles: horiz, minW: 5 },
  };

  /** Merge override properties into a base layout item, producing a fully-typed `LayoutItem` */
  const update = (i: keyof typeof base, updates: Partial<LayoutItem>): LayoutItem => {
    return { ...base[i], ...updates } as LayoutItem;
  };

  // prettier-ignore
  const xlLayout: LayoutItem[] = [
    update("recipe",      { x:  0, y:     0, w:   7 }),
    update("watchers",    { x:  7, y:     0, w:  12 }),
    update("props-chart", { x: 19, y:     0, w:  13 }),
    update("properties",  { x:  0, y:     h, w:   7 }),
    update("fpd-graph",   { x:  7, y:     h, w:  10 }),
    update("composition", { x: 17, y:     h, w:  15 }),
  ];

  // prettier-ignore
  const lgLayout: LayoutItem[] = [
    update("recipe",      { x:  0, y:     0, w:   7 }),
    update("watchers",    { x:  7, y:     0, w:  17, h: 7}),
    update("props-chart", { x:  7, y:     7, w:  17, h: 7 }),
    update("properties",  { x:  0, y:     h, w:   7 }),
    update("fpd-graph",   { x:  7, y:    14, w:   9, h: 8 }),
    update("composition", { x: 16, y:    14, w:   8 }),
  ];

  // prettier-ignore
  const mdLayout: LayoutItem[] = [
    update("recipe",      { x:  0, y:     0, w:   6 }),
    update("watchers",    { x:  6, y:     0, w:  10, h: 7}),
    update("props-chart", { x:  6, y:     7, w:  10, h: 7 }),
    update("properties",  { x:  0, y:     h, w:   6 }),
    update("fpd-graph",   { x:  6, y:    14, w:  10, h: 8 }),
    update("composition", { x:  0, y: h * 2, w:  fullW("md") }),
  ];

  // prettier-ignore
  const smLayout: LayoutItem[] = [
    update("recipe",      { x:  0, y:     0, w:  5 }),
    update("watchers",    { x:  5, y:     0, w:  7 }),
    update("properties",  { x:  0, y:     h, w:  4 }),
    update("props-chart", { x:  4, y:     h, w:  8 }),
    update("fpd-graph",   { x:  0, y: h * 2, w:  6 }),
    update("composition", { x:  6, y: h * 2, w:  6 }),
  ];

  // prettier-ignore
  const xsLayout: LayoutItem[] = [
    update("recipe",      { x:  0, y:     0, w:  fullW("xs") }),
    update("watchers",    { x:  0, y:     h, w:  fullW("xs") }),
    update("props-chart", { x:  0, y: h * 2, w:  fullW("xs") }),
    update("properties",  { x:  0, y: h * 3, w:  fullW("xs") }),
    update("fpd-graph",   { x:  0, y: h * 4, w:  fullW("xs"), h: h - 1 }),
    update("composition", { x:  0, y: h * 5 - 1, w: fullW("xs") }),
  ];

  const defaultLayouts: ResponsiveLayouts = {
    xl: xlLayout,
    lg: lgLayout,
    md: mdLayout,
    sm: smLayout,
    xs: xsLayout,
  };

  const [layouts, setLayouts] = useState<ResponsiveLayouts>(defaultLayouts);
  const hydratedRef = useRef(false);

  // Hydrate stored layouts on mount; falls through to defaults when storage is empty or its
  // schema (version/fingerprint) no longer matches the current panel set.
  useEffect(() => {
    const stored = loadStoredLayouts(defaultLayouts);
    if (stored) setLayouts(stored);
    hydratedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on every committed layout change. Skipped until hydration completes so the initial
  // mount with default layouts doesn't clobber the stored value before we can read it.
  const handleLayoutChange = (_: Layout, allLayouts: ResponsiveLayouts) => {
    if (!hydratedRef.current) return;
    setLayouts(allLayouts);
    saveLayouts(allLayouts);
  };

  // Listen for reset events fired by the Header's "Reset layout" button (which lives outside
  // this component's React tree); fall back to the hardcoded defaults when one arrives.
  useEffect(() => {
    return onLayoutReset(() => setLayouts(defaultLayouts));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className="pr-4">
      {mounted && (
        <ResponsiveGridLayout
          breakpoints={breakpoints}
          width={width}
          cols={cols}
          layouts={layouts}
          onLayoutChange={handleLayoutChange}
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
          <div key="watchers">{<WatchersPanel {...watchersPanelProps} />}</div>
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
