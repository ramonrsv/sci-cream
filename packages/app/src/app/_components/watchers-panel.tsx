"use client";

import { GripVertical } from "lucide-react";

import { Recipe, filterActiveSlots } from "@/lib/recipe";
import { WatchersView } from "@/app/_elements/watchers/watchers";
import { DRAG_HANDLE_ICON_SIZE } from "@/lib/styles/sizes";

import { Bridge as WasmBridge, type LightRecipe } from "@workspace/sci-cream";
import { STORAGE_KEYS } from "@/lib/local-storage";

/**
 * Calculator-page panel wrapping {@link WatchersView} with grid-layout chrome and a drag handle.
 *
 * Applies slot filtering so the watcher cards show the main recipe plus any non-empty reference
 * recipes (main first, then refs in slot order).
 *
 * `wasmBridge` and `onApplyBalancedMain` are forwarded to enable the toolbar's Balance button;
 * both are optional so the panel can render in tests without wiring the recipe-update path.
 */
export function WatchersPanel({
  recipes,
  wasmBridge,
  onApplyBalancedMain,
}: {
  recipes: Recipe[];
  wasmBridge?: WasmBridge;
  onApplyBalancedMain?: (balanced: LightRecipe) => void;
}) {
  const active = filterActiveSlots(recipes);
  return (
    <div id="watchers-panel" className="grid-component relative h-full w-full">
      <WatchersView
        main={active[0]}
        refs={active.slice(1)}
        toolbarPrefix={<GripVertical size={DRAG_HANDLE_ICON_SIZE} className="drag-handle" />}
        wasmBridge={wasmBridge}
        onApplyBalancedMain={onApplyBalancedMain}
        persistKey={STORAGE_KEYS.watchersPanelView}
      />
    </div>
  );
}
