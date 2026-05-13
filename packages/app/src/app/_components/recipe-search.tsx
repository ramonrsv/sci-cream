"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Trash } from "lucide-react";
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
import { autoLink } from "@/lib/text";

/** Sources of recipes, including 'All' for all available sources */
export enum RecipeSource {
  All = "all",
  Embedded = "embedded",
  Saved = "saved",
}

/** A recipe entry tagged with its source */
export type TaggedEntry = RecipeEntryJson & { _source: RecipeSource.Embedded | RecipeSource.Saved };

/** Merge, tag, and filter recipe entries by source and text query (name, author, or ingredient). */
export function filterRecipeEntries(
  embeddedEntries: RecipeEntryJson[],
  savedEntries: RecipeEntryJson[],
  source: RecipeSource,
  query: string,
): TaggedEntry[] {
  const all: TaggedEntry[] = [
    ...embeddedEntries.map((e): TaggedEntry => ({ ...e, _source: RecipeSource.Embedded })),
    ...savedEntries.map((e): TaggedEntry => ({ ...e, _source: RecipeSource.Saved })),
  ];

  const pool = source === RecipeSource.All ? all : all.filter((e) => e._source === source);

  if (!query.trim()) return pool;
  const q = query.toLowerCase();

  return pool.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      (e.author?.toLowerCase().includes(q) ?? false) ||
      e.recipe.some(([name]) => name.toLowerCase().includes(q)),
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
}: RecipeSearchProps) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<RecipeSource>(RecipeSource.All);
  const [targetSlot, setTargetSlot] = useState(slots?.[0] ?? 0);
  const [selectedEntry, setSelectedEntry] = useState<TaggedEntry | null>(null);

  const { updateIdx: wasmUpdateIdx, wasmBridge } = useSeededWasmResources()[STATE_VAL];

  const handleDeleteSelected = async () => {
    if (!selectedEntry || selectedEntry._source !== RecipeSource.Saved || !onDeleteSavedRecipe) {
      throw new Error(
        "handleDeleteSelected invoked without a selected saved entry or a delete callback — " +
          "the Delete button should not have been rendered in this state",
      );
    }

    if (!window.confirm(`Delete saved recipe "${selectedEntry.name}"?`)) return;
    await onDeleteSavedRecipe(selectedEntry);
    setSelectedEntry(null);
  };

  const recipeOfSelected = useMemo<Recipe>(
    () => makeRecipeFromEntry(selectedEntry, wasmBridge),
    [selectedEntry, wasmUpdateIdx, wasmBridge], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(
    () => () => {
      try {
        recipeOfSelected.mixProperties.free();
      } catch {
        // React Strict Mode fires effect cleanups twice (mount → cleanup → remount), so the first
        // cleanup frees the object and the second would double-free. Safe to swallow in production.
      }
    },
    [recipeOfSelected],
  );

  const filtered = useMemo(
    () => filterRecipeEntries(allRecipeEntries, savedRecipes, source, query),
    [savedRecipes, query, source],
  );

  const sourceOptions: { value: RecipeSource; label: string }[] = [
    { value: RecipeSource.All, label: "All" },
    { value: RecipeSource.Embedded, label: "Built-in" },
    { value: RecipeSource.Saved, label: "Saved" },
  ];

  const isSelected = (entry: TaggedEntry) =>
    selectedEntry !== null &&
    selectedEntry._source === entry._source &&
    recipeEntryId(selectedEntry) === recipeEntryId(entry);

  const comments = selectedEntry?.comments as string | undefined;

  return (
    <div id="recipe-search" className="flex flex-col gap-3">
      {/* Search bar + source filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={14}
            className="text-secondary pointer-events-none absolute top-1/2 left-2 -translate-y-1/2"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, author, or ingredient…"
            className="table-fillable-input w-full rounded-lg py-1 pr-2 pl-7"
          />
        </div>
        <div className="flex">
          {sourceOptions.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSource(value)}
              className={`action-button px-2 py-0.5 text-sm ${
                source === value ? "border-brd-lt dark:border-brd-dk font-medium" : ""
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col gap-4 md:h-[75vh] md:flex-row">
        {/* Left: recipe list */}
        <div className="flex h-[20vh] shrink-0 flex-col gap-1.5 overflow-y-auto pr-1 [scrollbar-gutter:stable] md:h-auto md:w-60">
          {filtered.length === 0 ? (
            <p className="text-secondary text-sm">No recipes found.</p>
          ) : (
            filtered.map((entry) => (
              <button
                key={`${entry._source}-${recipeEntryId(entry)}`}
                onClick={() => setSelectedEntry(entry)}
                className={`search-list-item ${isSelected(entry) ? "search-list-item-active" : ""}`}
              >
                <span className="text-primary block truncate text-sm font-medium">
                  {entry.name}
                </span>
                {entry.author && (
                  <span className="text-secondary block truncate text-xs">{entry.author}</span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Right: detail panel */}
        {selectedEntry === null ? (
          <div className="search-empty">Select a recipe to see details</div>
        ) : (
          <div className="search-detail-panel">
            {/* Header: title, source badge, load button */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <h2 className="text-primary text-base font-semibold">{selectedEntry.name}</h2>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedEntry.author && (
                    <span className="text-secondary text-sm">{selectedEntry.author}</span>
                  )}
                  <span className="meta-tag">
                    {selectedEntry._source === RecipeSource.Embedded ? "built-in" : "saved"}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {selectedEntry._source === RecipeSource.Saved && onDeleteSavedRecipe && (
                  <button
                    onClick={handleDeleteSelected}
                    title="Delete saved recipe"
                    aria-label="Delete saved recipe"
                    className="action-button px-2 py-0.5 text-sm"
                  >
                    <Trash size={14} />
                  </button>
                )}
                {onLoadRecipe && (
                  <>
                    {slots && slots.length > 1 && (
                      <select
                        value={targetSlot}
                        onChange={(e) => setTargetSlot(parseInt(e.target.value))}
                        className="select-input text-sm"
                      >
                        {slots.map((slot, idx) => (
                          <option key={idx} value={slot}>
                            {makeRecipeId(slot)}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={() => onLoadRecipe(selectedEntry, targetSlot)}
                      className="action-button px-2 py-0.5 text-sm"
                    >
                      Load
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Ingredient table + mix properties side by side */}
            {recipeOfSelected && (
              <div className="@container flex flex-wrap items-start gap-6">
                <div className="min-w-50 flex-1 basis-65 @[484px]:mt-8.25">
                  <RecipeTable
                    recipe={recipeOfSelected}
                    isValidIngredient={(name) => wasmBridge.has_ingredient(name)}
                  />
                </div>
                <div
                  className="max-w-65 min-w-50 flex-1 basis-35"
                  style={{ height: `${STD_COMPONENT_H_PX}px` }}
                >
                  <PropertiesView recipes={[recipeOfSelected]} />
                </div>
              </div>
            )}

            {/* Comments */}
            {comments && (
              <p className="text-secondary text-sm leading-relaxed">{autoLink(comments)}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
