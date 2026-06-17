"use client";

import { GripVertical } from "lucide-react";

import { RecipeContextState } from "@/lib/recipe";
import { RecipeEditor } from "@/app/_elements/tables/recipe";
import { STD_COMPONENT_H_PX, DRAG_HANDLE_ICON_SIZE } from "@/lib/styles/sizes";
import { STORAGE_KEYS } from "@/lib/local-storage";

/**
 * Calculator-page panel wrapping {@link RecipeEditor} with grid-layout chrome and a drag handle.
 */
export function RecipeEditorPanel({
  props,
}: {
  props: { recipeCtxState: RecipeContextState; urlSlot?: number };
}) {
  return (
    <div
      id="recipe-editor-panel"
      className="grid-component min-w-50"
      style={{ height: `${STD_COMPONENT_H_PX}px` }}
    >
      <RecipeEditor
        props={{
          ...props,
          persistKey: STORAGE_KEYS.recipeEditorPanel,
          toolbarPrefix: <GripVertical size={DRAG_HANDLE_ICON_SIZE} className="drag-handle" />,
        }}
      />
    </div>
  );
}
