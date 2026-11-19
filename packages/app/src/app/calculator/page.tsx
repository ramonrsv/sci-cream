"use client";

import { useState, useEffect, useRef } from "react";
import {
  ResponsiveGridLayout,
  ResponsiveLayouts,
  useContainerWidth,
  type Layout,
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
} from "@/lib/recipe/recipe";
import { RecipeEditorPanel } from "@/app/_components/recipe-editor-panel";
import type { TargetsMap } from "@/app/_elements/watchers/watchers";
import { useSeededWasmResources } from "@/lib/resources/wasm";
import { REACT_GRID_ROW_HEIGHT } from "@/lib/styles/sizes";
import { DEFAULT_GRID_LAYOUTS, GRID_BREAKPOINTS, GRID_COLS } from "@/lib/calculator-grid";
import { loadStoredLayouts, onLayoutReset, saveLayouts } from "@/lib/calculator-layout";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import { usePersistedState } from "@/lib/hooks/use-persisted-state";
import { STATE_VAL, STATE_SET } from "@/lib/util";

/**
 * Main calculator page: responsive drag-and-drop grid of recipe and major display components
 *
 * The layout is defined as a set of breakpoint-specific configurations, which are passed to
 * `ResponsiveGridLayout` to automatically switch between them based on the container width.
 *
 * All grid items can be resized horizontally and vertically.
 *
 * `RecipeEditor`'s `RecipeSelect` opens on the slot retained for it, default 0 ('Recipe'). Loading
 * a recipe into a slot from another route sets it first, see `useOpenCalculator`.
 */
export default function CalculatorPage() {
  // `measureBeforeMount: true` keeps `mounted` false until the real width is measured, so the
  // `{mounted && ...}` gate defers the grid's first render until width measurement and layout
  // hydration have batched. Otherwise the grid mounts at the placeholder width with default
  // layouts and races a width change against stored-layout adoption, which a client-side
  // navigation (unlike a full refresh) can settle back to defaults.
  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });

  const [wasmResources] = useSeededWasmResources();

  const recipeCtxState = useState(() => makeEmptyRecipeContext());
  const [recipeContext, setRecipeContext] = recipeCtxState;
  const recipes = recipeContext.recipes;

  // Continuous-balance mode: session-only, off by default; a quantity edit or paste stops it.
  const autoBalanceState = useState(false);

  // Balancing targets: persisted, edited by the watchers panel, read by the properties chart.
  const targetsState = usePersistedState<TargetsMap>(STORAGE_KEYS.watcherTargets, {});

  /** Apply a balanced light recipe (from `Bridge.balance_recipe`) onto the main recipe (slot 0) */
  const onApplyBalancedMain = (balanced: LightRecipe) => {
    const current = recipeContext.recipes[0];
    const updates = makeBalancedRecipeUpdates(current, balanced, wasmResources.hasIngredient);
    const updated = makeUpdatedRecipe(current, updates, wasmResources);
    setRecipeContext((prev) => makeUpdatedRecipeContext(prev, [updated]));
  };

  const recipeEditorPanelProps = {
    recipeCtxState,
    onUserQuantityEdit: () => autoBalanceState[STATE_SET](false),
  };

  const watchersPanelProps = {
    recipes,
    wasmBridge: wasmResources.wasmBridge,
    onApplyBalancedMain,
    autoBalanceState,
    targetsState,
  };

  const propertiesChartPanelProps = { recipes, targets: targetsState[STATE_VAL] };

  const [layouts, setLayouts] = useState<ResponsiveLayouts>(DEFAULT_GRID_LAYOUTS);
  const hydratedRef = useRef(false);

  // Hydrate stored layouts on mount; falls through to defaults when storage is empty or its
  // schema (version/fingerprint) no longer matches the current panel set.
  useEffect(() => {
    const stored = loadStoredLayouts(DEFAULT_GRID_LAYOUTS);
    // Stored layouts can be read only after hydration, so the restore lands in this mount effect.
    if (stored) setLayouts(stored); // eslint-disable-line react-hooks/set-state-in-effect
    hydratedRef.current = true;
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
    return onLayoutReset(() => setLayouts(DEFAULT_GRID_LAYOUTS));
  }, []);

  return (
    <div ref={containerRef} className="page-gutters">
      {mounted && (
        <ResponsiveGridLayout
          breakpoints={GRID_BREAKPOINTS}
          width={width}
          cols={GRID_COLS}
          layouts={layouts}
          onLayoutChange={handleLayoutChange}
          rowHeight={REACT_GRID_ROW_HEIGHT}
          margin={[20, 20]}
          containerPadding={[0, 0]}
          dragConfig={{ handle: ".drag-handle" }}
        >
          <div key="recipe">{<RecipeEditorPanel {...recipeEditorPanelProps} />}</div>
          <div key="properties">{<PropertiesPanel recipes={recipes} />}</div>
          <div key="composition">{<CompositionBreakdownPanel recipes={recipes} />}</div>
          <div key="props-chart">{<PropertiesChartPanel {...propertiesChartPanelProps} />}</div>
          <div key="fpd-graph">{<FpdGraphPanel recipes={recipes} />}</div>
          <div key="watchers">{<WatchersPanel {...watchersPanelProps} />}</div>
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
