"use client";

import { GripVertical } from "lucide-react";

import { RecipeContextState } from "@/lib/recipe";
import { RecipeEditor } from "@/app/_elements/tables/recipe";
import { DRAG_HANDLE_ICON_SIZE } from "@/lib/styles/sizes";
import { STORAGE_KEYS } from "@/lib/local-storage";

/**
 * Calculator-page panel wrapping {@link RecipeEditor} with grid-layout chrome and a drag handle.
 */
export function RecipeEditorPanel({
  recipeCtxState,
  urlSlot,
  onUserQuantityEdit,
}: {
  recipeCtxState: RecipeContextState;
  urlSlot?: number;
  onUserQuantityEdit?: () => void;
}) {
  return (
    <div id="recipe-editor-panel" className="grid-component h-full w-full min-w-50">
      <RecipeEditor
        recipeCtxState={recipeCtxState}
        urlSlot={urlSlot}
        onUserQuantityEdit={onUserQuantityEdit}
        persistKey={STORAGE_KEYS.recipeEditorPanel}
        toolbarPrefix={<GripVertical size={DRAG_HANDLE_ICON_SIZE} className="drag-handle" />}
      />
    </div>
  );
}
