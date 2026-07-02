"use client";

import { GripVertical } from "lucide-react";

import { Recipe } from "@/lib/recipe";
import { CompositionBreakdownView } from "@/app/_elements/tables/composition-breakdown";
import { DRAG_HANDLE_ICON_SIZE } from "@/lib/styles/sizes";
import { STORAGE_KEYS } from "@/lib/local-storage";

/**
 * Calculator-page panel wrapping {@link CompositionBreakdownView} with grid-layout chrome and a
 * drag handle. The view itself manages the currently displayed recipe slot via its own
 * `RecipeSelect`, so the panel passes the full recipes list through unfiltered.
 */
export function CompositionBreakdownPanel({ recipes }: { recipes: Recipe[] }) {
  return (
    <div id="composition-breakdown-panel" className="grid-component h-full w-full min-w-50">
      <CompositionBreakdownView
        recipes={recipes}
        toolbarPrefix={<GripVertical size={DRAG_HANDLE_ICON_SIZE} className="drag-handle" />}
        persistKey={STORAGE_KEYS.compositionBreakdownPanelView}
      />
    </div>
  );
}
