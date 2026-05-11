"use client";

import { GripVertical } from "lucide-react";

import { RecipeContextState, RecipeResourcesState } from "@/lib/recipe";
import { RecipeEditor } from "@/app/_elements/tables/recipe";
import { STD_COMPONENT_H_PX, DRAG_HANDLE_ICON_SIZE } from "@/lib/styles/sizes";

/**
 * Calculator-page panel wrapping {@link RecipeEditor} with grid-layout chrome and a drag handle.
 */
export function RecipeEditorPanel({
  props,
}: {
  props: {
    recipeCtxState: RecipeContextState;
    recipeResourcesState: RecipeResourcesState;
    initialRecipeIdx?: number;
  };
}) {
  return (
    <div id="recipe-grid" className="grid-component" style={{ height: `${STD_COMPONENT_H_PX}px` }}>
      <RecipeEditor
        props={{
          ...props,
          toolbarPrefix: <GripVertical size={DRAG_HANDLE_ICON_SIZE} className="drag-handle" />,
        }}
      />
    </div>
  );
}
