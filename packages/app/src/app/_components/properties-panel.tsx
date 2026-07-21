"use client";

import { GripVertical } from "lucide-react";

import { Recipe, filterActiveSlots } from "@/lib/recipe/recipe";
import { PropertiesView } from "@/app/_elements/tables/properties";
import { DRAG_HANDLE_ICON_SIZE } from "@/lib/styles/sizes";
import { STORAGE_KEYS } from "@/lib/local-storage";

/**
 * Calculator-page panel wrapping {@link PropertiesView} with grid-layout chrome and a drag handle.
 *
 * Applies slot filtering so the table shows the main recipe plus any non-empty reference recipes.
 */
export function PropertiesPanel({ recipes }: { recipes: Recipe[] }) {
  return (
    <div id="properties-panel" className="grid-component h-full w-full min-w-55">
      <PropertiesView
        recipes={filterActiveSlots(recipes)}
        toolbarPrefix={<GripVertical size={DRAG_HANDLE_ICON_SIZE} className="drag-handle" />}
        persistKey={STORAGE_KEYS.propertiesPanelView}
      />
    </div>
  );
}
