"use client";

import { GripVertical } from "lucide-react";

import { Recipe } from "@/lib/recipe";
import { CompositionBreakdownView } from "@/app/_elements/tables/composition-breakdown";
import { STD_COMPONENT_H_PX, DRAG_HANDLE_ICON_SIZE } from "@/lib/styles/sizes";

/**
 * Calculator-page panel wrapping {@link CompositionBreakdownView} with grid-layout chrome and a
 * drag handle. The view itself manages the currently displayed recipe slot via its own
 * `RecipeSelect`, so the panel passes the full recipes list through unfiltered.
 */
export function CompositionBreakdownPanel({ recipes }: { recipes: Recipe[] }) {
  return (
    <div
      id="composition-breakdown-panel"
      className="grid-component w-full min-w-50"
      style={{ height: `${STD_COMPONENT_H_PX}px` }}
    >
      <CompositionBreakdownView
        recipes={recipes}
        toolbarPrefix={<GripVertical size={DRAG_HANDLE_ICON_SIZE} className="drag-handle" />}
      />
    </div>
  );
}
