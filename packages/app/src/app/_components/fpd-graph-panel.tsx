"use client";

import { GripVertical } from "lucide-react";

import { Recipe, filterActiveSlots } from "@/lib/recipe";
import { FpdGraph } from "@/app/_elements/charts/fpd-graph";
import { DRAG_HANDLE_ICON_SIZE } from "@/lib/styles/sizes";

/**
 * Calculator-page panel wrapping {@link FpdGraph} with grid-layout chrome and a drag handle.
 *
 * Applies slot filtering so the graph shows the main recipe plus any non-empty reference recipes.
 */
export function FpdGraphPanel({ recipes }: { recipes: Recipe[] }) {
  const active = filterActiveSlots(recipes);
  return (
    <div id="fpd-graph-panel" className="grid-component relative flex h-full w-full flex-col">
      <div className="flex items-center">
        <GripVertical size={DRAG_HANDLE_ICON_SIZE} className="drag-handle" />
      </div>
      <div className="min-h-0 flex-1 px-2 pb-2">
        <FpdGraph main={active[0]} refs={active.slice(1)} />
      </div>
    </div>
  );
}
