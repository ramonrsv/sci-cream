"use client";

import type { ReactNode } from "react";

import { RecipeTable } from "@/app/_elements/tables/recipe";
import { PropertiesView } from "@/app/_elements/tables/properties";
import { ToolbarSpacer } from "@/app/_elements/selects/toolbar-spacer";
import { autoLink } from "@/app/_elements/text";
import { STD_COMPONENT_H_PX } from "@/lib/styles/sizes";
import type { Recipe } from "@/lib/recipe";

/** Read-only recipe comments paragraph with URLs auto-linked. */
export function RecipeComments({ text }: { text: string }) {
  return <p className="text-secondary text-sm leading-relaxed">{autoLink(text)}</p>;
}

/**
 * Shared body of a recipe detail view: the ingredient table beside the mix-properties view, with
 * optional comments below. Used by the recipe-search detail panel and the share viewer.
 *
 * `comments` renders beneath the body — {@link RecipeComments} for read-only text, or the
 * caller's editable widget. A {@link Recipe.mixError} flags the evaporation readout red.
 */
export function RecipeDetailBody({
  recipe,
  isValidIngredient,
  persistKey,
  comments,
}: {
  recipe: Recipe;
  isValidIngredient: (name: string) => boolean;
  persistKey?: string;
  comments?: ReactNode;
}) {
  return (
    <>
      <div className="@container flex flex-wrap items-start gap-6">
        <div className="min-w-50 flex-1 basis-65">
          {/* A spacer reserves the properties view's toolbar height so the tables line up side by
              side. When there's evaporation it stays at every width, overlaid by the readout. */}
          <div className="relative">
            <div className={recipe.evaporation ? "" : "hidden @[484px]:block"}>
              <ToolbarSpacer />
            </div>
            {recipe.evaporation ? (
              <div
                className="absolute inset-0 flex items-center justify-end"
                title={recipe.mixError ?? "Grams of water evaporated during preparation"}
              >
                <div className="bg-surface flex items-center rounded-t px-4 py-1.25">
                  <span className="text-secondary text-xs font-medium tracking-wide whitespace-nowrap uppercase">
                    Evap (g)
                  </span>
                  <span
                    className={`comp-val ml-2 text-sm ${recipe.mixError ? "text-red-500" : ""}`}
                  >
                    {recipe.evaporation.toFixed(0)}
                  </span>
                </div>
              </div>
            ) : null}
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
