"use client";

import { GripVertical } from "lucide-react";

import { Recipe, filterActiveSlots } from "@/lib/recipe";
import { WatchersView } from "@/app/_elements/watchers/watchers";
import { DRAG_HANDLE_ICON_SIZE } from "@/lib/styles/sizes";

/**
 * Calculator-page panel wrapping {@link WatchersView} with grid-layout chrome and a drag handle.
 *
 * Applies slot filtering so the watcher cards show the main recipe plus any non-empty reference
 * recipes (main first, then refs in slot order).
 */
export function WatchersPanel({ recipes }: { recipes: Recipe[] }) {
  const active = filterActiveSlots(recipes);
  return (
    <div id="watchers-panel" className="grid-component relative h-full w-full">
      <WatchersView
        main={active[0]}
        refs={active.slice(1)}
        toolbarPrefix={<GripVertical size={DRAG_HANDLE_ICON_SIZE} className="drag-handle" />}
      />
    </div>
  );
}
