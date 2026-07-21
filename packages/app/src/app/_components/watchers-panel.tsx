"use client";

import type { Dispatch, SetStateAction } from "react";
import { GripVertical } from "lucide-react";

import { Recipe } from "@/lib/recipe/recipe";
import { WatchersView, type TargetsMap } from "@/app/_elements/watchers/watchers";
import { DRAG_HANDLE_ICON_SIZE } from "@/lib/styles/sizes";

import { Bridge as WasmBridge, type LightRecipe } from "@workspace/sci-cream";
import { STORAGE_KEYS } from "@/lib/local-storage";

/**
 * Calculator-page panel wrapping {@link WatchersView} with grid-layout chrome and a drag handle.
 *
 * `wasmBridge` and `onApplyBalancedMain` are forwarded to enable the toolbar's Balance button;
 * both are optional so the panel can render in tests without wiring the recipe-update path.
 * `targetsState` (optional) threads the page-owned targets map so other panels can read it.
 */
export function WatchersPanel({
  recipes,
  wasmBridge,
  onApplyBalancedMain,
  autoBalanceState,
  targetsState,
}: {
  recipes: Recipe[];
  wasmBridge?: WasmBridge;
  onApplyBalancedMain?: (balanced: LightRecipe) => void;
  autoBalanceState?: [boolean, Dispatch<SetStateAction<boolean>>];
  targetsState?: [TargetsMap, Dispatch<SetStateAction<TargetsMap>>];
}) {
  return (
    <div id="watchers-panel" className="grid-component relative h-full w-full">
      <WatchersView
        main={recipes[0]}
        refs={recipes.slice(1)}
        toolbarPrefix={<GripVertical size={DRAG_HANDLE_ICON_SIZE} className="drag-handle" />}
        wasmBridge={wasmBridge}
        onApplyBalancedMain={onApplyBalancedMain}
        autoBalanceState={autoBalanceState}
        targetsState={targetsState}
        persistKey={STORAGE_KEYS.watchersPanelView}
      />
    </div>
  );
}
