"use client";

import type { ReactNode } from "react";

import { RecipeTable } from "@/app/_elements/tables/recipe";
import { PropertiesView } from "@/app/_elements/tables/properties";
import { ToolbarSpacer } from "@/app/_elements/selects/toolbar-spacer";
import { Markdown } from "@/app/_elements/markdown";
import { STD_COMPONENT_H_PX } from "@/lib/styles/sizes";
import type { Recipe } from "@/lib/recipe/recipe";

/** Read-only recipe comments rendered as markdown (GFM, with reference footnotes). */
export function RecipeComments({ text }: { text: string }) {
  return <Markdown text={text} />;
}

/**
 * Shared body of a recipe detail view: the ingredient table beside the mix-properties view, with
 * optional comments below. Used by the recipe-search detail panel and the share viewer.
 *
 * `toolbarStart` overlays an always-present invisible spacer in the table's toolbar band,
 * height-matched to {@link PropertiesView}'s toolbar so the two tables line up. `comments` renders
 * beneath the body — {@link RecipeComments} for read-only text, or the caller's editable widget.
 */
export function RecipeDetailBody({
  recipe,
  isValidIngredient,
  persistKey,
  toolbarStart,
  comments,
}: {
  recipe: Recipe;
  isValidIngredient: (name: string) => boolean;
  persistKey?: string;
  toolbarStart?: ReactNode;
  comments?: ReactNode;
}) {
  return (
    <>
      <div className="@container flex flex-wrap items-start gap-6">
        <div className="min-w-50 flex-1 basis-65">
          {/* At narrow widths the band collapses when there's nothing to show, to save vertical
              space; when there's toolbarStart it stays at every width, overlaid on the spacer. */}
          <div className={`relative ${toolbarStart ? "" : "hidden @[484px]:block"}`}>
            <div className="toolbar">
              <ToolbarSpacer />
            </div>
            {toolbarStart && <div className="toolbar absolute inset-0">{toolbarStart}</div>}
          </div>
          <RecipeTable recipe={recipe} isValidIngredient={isValidIngredient} />
        </div>
        <div
          className="max-w-65 min-w-50 flex-1 basis-35"
          style={{ height: `${STD_COMPONENT_H_PX}px` }}
        >
          <PropertiesView recipes={[recipe]} persistKey={persistKey} />
        </div>
      </div>
      {comments}
    </>
  );
}
