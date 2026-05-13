"use client";

import { useEffect, useMemo } from "react";
import {
  allRecipeEntries,
  recipeEntryId,
  type RecipeEntryJson,
  Bridge as WasmBridge,
  MixProperties,
} from "@workspace/sci-cream";

import { makeRecipeId, type Recipe } from "@/lib/recipe";
import { RecipeTable } from "@/app/_elements/tables/recipe";
import { PropertiesView } from "@/app/_elements/tables/properties";
import { STD_COMPONENT_H_PX } from "@/lib/styles/sizes";
import { useSeededWasmResources } from "@/lib/wasm-resources";
import { STATE_VAL } from "@/lib/util";
import { EntitySearch, EntitySource, Tagged } from "@/app/_components/entity-search";

/** Sources of recipes; re-export of {@link EntitySource} for backwards compatibility */
export const RecipeSource = EntitySource;
export type RecipeSource = EntitySource;

/** A recipe entry tagged with its source */
export type TaggedEntry = Tagged<RecipeEntryJson>;

/** Case-insensitive match against name, author, or any ingredient name in the recipe */
export function recipeMatchesQuery(entry: RecipeEntryJson, q: string): boolean {
  return (
    entry.name.toLowerCase().includes(q) ||
    (entry.author?.toLowerCase().includes(q) ?? false) ||
    entry.recipe.some(([name]) => name.toLowerCase().includes(q))
  );
}

/** Props for {@link RecipeSearch} */
export interface RecipeSearchProps {
  /** Called when the user clicks "Load" on a recipe entry; `slotIndex` is the target slot */
  onLoadRecipe?: (entry: RecipeEntryJson, slotIndex: number) => void;
  /** User-saved recipes from an external source such as a database */
  savedRecipes?: RecipeEntryJson[];
  /** Enabled slot indices for loading recipes; default 0 if not provided or empty */
  slots?: number[];
  /**
   * Called when the user confirms deletion of a saved recipe entry. The parent is responsible for
   * the actual deletion and for refreshing `savedRecipes`. Only invoked for `RecipeSource.Saved`.
   */
  onDeleteSavedRecipe?: (entry: RecipeEntryJson) => void | Promise<void>;
  /**
   * Called when the user clicks "Save comments" on a saved recipe entry. The parent is responsible
   * for persisting the change and refreshing `savedRecipes`. Only invoked for `RecipeSource.Saved`.
   */
  onUpdateSavedRecipeComments?: (entry: RecipeEntryJson, comments: string) => void | Promise<void>;
}

/**
 * Creates a `Recipe` object from a `RecipeEntryJson` and `WasmBridge`, without WASM `Ingredient`s.
 *
 * If `entry` is null, creates an empty recipe with no ingredients and default mix properties.
 */
function makeRecipeFromEntry(entry: RecipeEntryJson | null, bridge: WasmBridge): Recipe {
  return {
    index: 0,
    id: "Value",
    name: entry?.name ?? "",
    ingredientRows:
      entry?.recipe.map(([name, quantity], idx) => ({ index: idx, name, quantity })) ?? [],
    mixTotal: entry?.recipe.reduce((sum, [, quantity]) => sum + quantity, 0) ?? 0,
    mixProperties: entry
      ? bridge.calculate_recipe_mix_properties(
          entry.recipe.filter(([name]) => bridge.has_ingredient(name)),
        )
      : new MixProperties(),
  };
}

/** Detail-panel body for a recipe entry: ingredient table + mix properties side-by-side */
function RecipeDetailBody({ entry, bridge }: { entry: RecipeEntryJson; bridge: WasmBridge }) {
  const { updateIdx: wasmUpdateIdx } = useSeededWasmResources()[STATE_VAL];

  const recipe = useMemo<Recipe>(
    () => makeRecipeFromEntry(entry, bridge),
    [entry, wasmUpdateIdx, bridge], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(
    () => () => {
      try {
        recipe.mixProperties.free();
      } catch {
        // React Strict Mode fires effect cleanups twice (mount → cleanup → remount), so the first
        // cleanup frees the object and the second would double-free. Safe to swallow in production.
      }
    },
    [recipe],
  );

  return (
    <div className="@container flex flex-wrap items-start gap-6">
      <div className="min-w-50 flex-1 basis-65 @[484px]:mt-8.25">
        <RecipeTable recipe={recipe} isValidIngredient={(name) => bridge.has_ingredient(name)} />
      </div>
      <div
        className="max-w-65 min-w-50 flex-1 basis-35"
        style={{ height: `${STD_COMPONENT_H_PX}px` }}
      >
        <PropertiesView recipes={[recipe]} />
      </div>
    </div>
  );
}

/**
 * Searchable list of recipes from both the embedded sci-cream dataset and an optional
 * collection of user-saved recipes. Supports filtering by name, author, or ingredient.
 * Clicking a recipe entry opens its details and mix properties in a side panel.
 */
export function RecipeSearch({
  onLoadRecipe,
  savedRecipes = [],
  slots,
  onDeleteSavedRecipe,
  onUpdateSavedRecipeComments,
}: RecipeSearchProps) {
  const { wasmBridge } = useSeededWasmResources()[STATE_VAL];

  return (
    <EntitySearch<RecipeEntryJson>
      id="recipe-search"
      embeddedEntries={allRecipeEntries}
      savedEntries={savedRecipes}
      getId={recipeEntryId}
      getDisplayName={(e) => e.name}
      matchesQuery={recipeMatchesQuery}
      searchPlaceholder="Search by name, author, or ingredient…"
      emptyDetailText="Select a recipe to see details"
      emptyResultsText="No recipes found."
      deleteLabel="Delete saved recipe"
      getDeleteConfirmText={(entry) => `Delete saved recipe "${entry.name}"?`}
      commentsLabel="Recipe comments"
      renderListItemSubtitle={(entry) =>
        entry.author && (
          <span className="text-secondary block truncate text-xs">{entry.author}</span>
        )
      }
      renderHeaderMeta={(entry) =>
        entry.author && <span className="text-secondary text-sm">{entry.author}</span>
      }
      renderDetailBody={(entry) => <RecipeDetailBody entry={entry} bridge={wasmBridge} />}
      onLoad={onLoadRecipe}
      slots={slots}
      slotLabel={makeRecipeId}
      onDelete={onDeleteSavedRecipe}
      getComments={(entry) => entry.comments as string | undefined}
      onUpdateComments={onUpdateSavedRecipeComments}
    />
  );
}
