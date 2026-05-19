"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash } from "lucide-react";
import {
  allRecipeEntries,
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
import {
  EntitySearch,
  EntitySource,
  filterTaggedEntries,
  Tagged,
} from "@/app/_components/entity-search";
import type { SavedRecipeJson, SavedRecipeVersionJson } from "@/lib/data";

/** Sources of recipes; re-export of {@link EntitySource} for backwards compatibility */
export const RecipeSource = EntitySource;
export type RecipeSource = EntitySource;

/**
 * Wire-shape for a recipe surfaced by the search: a single identity (with optional `author`) and
 * one or more versions in ascending order. Embedded entries are adapted to single-version groups;
 * saved entries flow through with their server-supplied `id`/`versions`.
 */
export type GroupedRecipe = {
  /** Stable identifier within the search; for embedded uses {@link recipeEntryId}-style name */
  id: string;
  /** Server-side recipe id (only present for saved recipes) */
  recipeId?: number;
  name: string;
  author?: string;
  versions: SavedRecipeVersionJson[];
};

/** A grouped recipe tagged with its source */
export type TaggedGroupedRecipe = Tagged<GroupedRecipe>;

/** Case-insensitive match against name, author, or any ingredient name in any version */
export function recipeMatchesQuery(entry: GroupedRecipe, q: string): boolean {
  if (entry.name.toLowerCase().includes(q)) return true;
  if (entry.author?.toLowerCase().includes(q)) return true;
  return entry.versions.some((v) => v.recipe.some(([name]) => name.toLowerCase().includes(q)));
}

/** Adapt a flat `RecipeEntryJson` to a single-version {@link GroupedRecipe} */
export function adaptEmbeddedToGrouped(entry: RecipeEntryJson): GroupedRecipe {
  const comments = entry.comments as string | undefined;
  const id = entry.author ? `${entry.author}: ${entry.name}` : entry.name;
  return {
    id,
    name: entry.name,
    ...(entry.author !== undefined && { author: entry.author }),
    versions: [
      { version: 1, recipe: entry.recipe, ...(comments != null && { comments }), createdAt: "" },
    ],
  };
}

/** Adapt a server `SavedRecipeJson` to a {@link GroupedRecipe}; preserves the server-side id */
export function adaptSavedToGrouped(entry: SavedRecipeJson): GroupedRecipe {
  return {
    id: `saved-${entry.id}`,
    recipeId: entry.id,
    name: entry.name,
    versions: entry.versions,
  };
}

/** Props for {@link RecipeSearch} */
export interface RecipeSearchProps {
  /**
   * Called when the user clicks "Load" on a recipe version. `slotIndex` is the target slot, and
   * `version` identifies the chosen version (its `version` field). For embedded entries `recipeId`
   * is undefined; for saved entries it's the server-side recipe id.
   */
  onLoadRecipe?: (entry: GroupedRecipe, version: SavedRecipeVersionJson, slotIndex: number) => void;
  /** User-saved recipes from an external source such as a database */
  savedRecipes?: SavedRecipeJson[];
  /** Enabled slot indices for loading recipes; default 0 if not provided or empty */
  slots?: number[];
  /**
   * Called when the user confirms deletion of an entire saved recipe (all versions). Parent is
   * responsible for persisting the delete and refreshing `savedRecipes`. Saved-only.
   */
  onDeleteSavedRecipe?: (entry: GroupedRecipe) => void | Promise<void>;
  /**
   * Called when the user confirms deletion of a single version of a saved recipe. Parent persists
   * the delete and refreshes `savedRecipes`. Saved-only; not shown when only one version remains.
   */
  onDeleteSavedRecipeVersion?: (
    entry: GroupedRecipe,
    version: SavedRecipeVersionJson,
  ) => void | Promise<void>;
  /**
   * Called when the user clicks "Save comments" on a saved recipe version. Parent persists and
   * refreshes `savedRecipes`. Saved-only.
   */
  onUpdateSavedRecipeVersionComments?: (
    entry: GroupedRecipe,
    version: SavedRecipeVersionJson,
    comments: string,
  ) => void | Promise<void>;
}

/**
 * Creates a `Recipe` object from a flat `[name, qty][]` recipe and `WasmBridge`, without WASM
 * `Ingredient`s. Used by the detail panel to render the currently selected version.
 */
function makeRecipeFromRows(
  name: string,
  rows: [string, number][] | null,
  bridge: WasmBridge,
): Recipe {
  return {
    index: 0,
    id: "Value",
    name,
    ingredientRows: rows?.map(([n, quantity], idx) => ({ index: idx, name: n, quantity })) ?? [],
    mixTotal: rows?.reduce((sum, [, quantity]) => sum + quantity, 0) ?? 0,
    mixProperties: rows
      ? bridge.calculate_recipe_mix_properties(rows.filter(([n]) => bridge.has_ingredient(n)))
      : new MixProperties(),
  };
}

/** Format a version createdAt timestamp for display in the version dropdown */
function formatVersionDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** Build the display label for a version in the dropdown */
function formatVersionOption(v: SavedRecipeVersionJson, isLatest: boolean): string {
  const date = formatVersionDate(v.createdAt);
  const latest = isLatest ? " · latest" : "";
  const parts = [`v${v.version}`];
  if (date) parts.push(date);
  if (v.label) parts.push(v.label);
  return parts.join("  ·  ") + latest;
}

/**
 * Per-version comments editor. Keyed on `(entry.id, version.version)` by the parent so React
 * remounts it whenever the entry or selected version changes — this avoids the need for a
 * setState-in-effect reset and keeps the textarea state local to the active version.
 */
function VersionCommentsEditor({
  initialComments,
  onSave,
}: {
  initialComments: string;
  onSave: (comments: string) => void | Promise<void>;
}) {
  const [edited, setEdited] = useState<string>(initialComments);
  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={edited}
        onChange={(e) => setEdited(e.target.value)}
        placeholder="Add comments…"
        aria-label="Recipe comments"
        className="table-fillable-input text-secondary min-h-20 rounded-lg px-2 py-1 text-sm leading-relaxed"
      />
      <button onClick={() => onSave(edited)} className="action-button self-end px-2 py-0.5 text-sm">
        Save comments
      </button>
    </div>
  );
}

/**
 * Stateful detail panel for a grouped recipe; owns the selected-version state. The parent renders
 * this with `key={entry.id}` so React remounts it on entry change, which naturally resets the
 * selected-version state without a setState-in-effect.
 */
function RecipeDetailPanel({
  entry,
  bridge,
  slots,
  onLoadRecipe,
  onDeleteSavedRecipe,
  onDeleteSavedRecipeVersion,
  onUpdateSavedRecipeVersionComments,
}: { entry: TaggedGroupedRecipe; bridge: WasmBridge } & Pick<
  RecipeSearchProps,
  | "slots"
  | "onLoadRecipe"
  | "onDeleteSavedRecipe"
  | "onDeleteSavedRecipeVersion"
  | "onUpdateSavedRecipeVersionComments"
>) {
  const { updateIdx: wasmUpdateIdx } = useSeededWasmResources()[STATE_VAL];
  const isSaved = entry._source === EntitySource.Saved;
  const hasMultipleVersions = entry.versions.length > 1;

  const latestIdx = entry.versions.length - 1;
  const [selectedVersionIdx, setSelectedVersionIdx] = useState<number>(latestIdx);
  const selectedVersion = entry.versions[selectedVersionIdx] ?? entry.versions[latestIdx];

  const [targetSlot, setTargetSlot] = useState<number>(slots?.[0] ?? 0);

  const recipe = useMemo<Recipe>(
    () => makeRecipeFromRows(entry.name, selectedVersion?.recipe ?? null, bridge),
    [entry, selectedVersion, bridge, wasmUpdateIdx], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(
    () => () => {
      try {
        recipe.mixProperties.free();
      } catch {
        // React Strict Mode fires effect cleanups twice; second free would be a double-free.
      }
    },
    [recipe],
  );

  const deleteRecipeEnabled = isSaved && !!onDeleteSavedRecipe;
  const deleteVersionEnabled =
    isSaved && hasMultipleVersions && !!onDeleteSavedRecipeVersion && !!selectedVersion;
  const commentsEnabled = isSaved && !!onUpdateSavedRecipeVersionComments && !!selectedVersion;

  const handleDeleteRecipe = async () => {
    if (!deleteRecipeEnabled) return;
    const text = `Delete saved recipe "${entry.name}" and all ${entry.versions.length} of its versions?`;
    if (!window.confirm(text)) return;
    await onDeleteSavedRecipe(entry);
  };

  const handleDeleteVersion = async () => {
    if (!deleteVersionEnabled) return;
    const text = `Delete version ${selectedVersion.version} of "${entry.name}"?`;
    if (!window.confirm(text)) return;
    await onDeleteSavedRecipeVersion(entry, selectedVersion);
  };

  const handleSaveComments = async (comments: string) => {
    if (!commentsEnabled) return;
    await onUpdateSavedRecipeVersionComments(entry, selectedVersion, comments);
  };

  return (
    <>
      {/* Header: title, badges, action buttons */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-primary text-base font-semibold">{entry.name}</h2>
          <div className="flex flex-wrap items-center gap-2">
            {entry.author && <span className="text-secondary text-sm">{entry.author}</span>}
            <span className="meta-tag">{isSaved ? "saved" : "built-in"}</span>
            {hasMultipleVersions && (
              <span className="meta-tag">{entry.versions.length} versions</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {deleteRecipeEnabled && (
            <button
              onClick={handleDeleteRecipe}
              title="Delete saved recipe"
              aria-label="Delete saved recipe"
              className="action-button px-2 py-0.5 text-sm"
            >
              <Trash size={14} />
            </button>
          )}
          {onLoadRecipe && selectedVersion && (
            <>
              {slots && slots.length > 1 && (
                <select
                  value={targetSlot}
                  onChange={(e) => setTargetSlot(parseInt(e.target.value))}
                  className="select-input text-sm"
                  aria-label="Target slot"
                >
                  {slots.map((slot) => (
                    <option key={slot} value={slot}>
                      {makeRecipeId(slot)}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => onLoadRecipe(entry, selectedVersion, targetSlot)}
                className="action-button px-2 py-0.5 text-sm"
              >
                Load
              </button>
            </>
          )}
        </div>
      </div>

      {/* Version selector (only when there's more than one version) */}
      {hasMultipleVersions && (
        <div className="flex items-center gap-2">
          <label className="text-secondary text-xs" htmlFor="recipe-version-select">
            Version
          </label>
          <select
            id="recipe-version-select"
            value={selectedVersionIdx}
            onChange={(e) => setSelectedVersionIdx(parseInt(e.target.value))}
            className="select-input text-sm"
            aria-label="Recipe version"
          >
            {entry.versions.map((v, idx) => (
              <option key={v.version} value={idx}>
                {formatVersionOption(v, idx === latestIdx)}
              </option>
            ))}
          </select>
          {deleteVersionEnabled && (
            <button
              onClick={handleDeleteVersion}
              title="Delete this version"
              aria-label="Delete this version"
              className="action-button px-2 py-0.5 text-sm"
            >
              <Trash size={12} />
            </button>
          )}
        </div>
      )}

      {/* Body: ingredient table + mix properties */}
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

      {/* Comments — editable per-version for saved, read-only paragraph for embedded */}
      {commentsEnabled ? (
        <VersionCommentsEditor
          // Remount on version change so the textarea re-seeds from the new version's comments
          key={`${entry.id}-v${selectedVersion.version}`}
          initialComments={selectedVersion.comments ?? ""}
          onSave={handleSaveComments}
        />
      ) : (
        selectedVersion?.comments && (
          <p className="text-secondary text-sm leading-relaxed">
            {autoLink(selectedVersion.comments)}
          </p>
        )
      )}
    </>
  );
}

/**
 * Searchable list of recipes from both the embedded sci-cream dataset and an optional collection
 * of user-saved recipes. Each recipe appears as a single list item regardless of how many versions
 * it has; the detail panel exposes a version selector when more than one version exists. Per-version
 * comments are editable for saved versions; embedded entries display their `comments` read-only.
 */
export function RecipeSearch({
  onLoadRecipe,
  savedRecipes = [],
  slots,
  onDeleteSavedRecipe,
  onDeleteSavedRecipeVersion,
  onUpdateSavedRecipeVersionComments,
}: RecipeSearchProps) {
  const { wasmBridge } = useSeededWasmResources()[STATE_VAL];

  const embeddedGrouped = useMemo(() => allRecipeEntries.map(adaptEmbeddedToGrouped), []);
  const savedGrouped = useMemo(() => savedRecipes.map(adaptSavedToGrouped), [savedRecipes]);

  return (
    <EntitySearch<GroupedRecipe>
      id="recipe-search"
      embeddedEntries={embeddedGrouped}
      savedEntries={savedGrouped}
      getId={(e) => e.id}
      getDisplayName={(e) => e.name}
      matchesQuery={recipeMatchesQuery}
      searchPlaceholder="Search by name, author, or ingredient…"
      emptyDetailText="Select a recipe to see details"
      emptyResultsText="No recipes found."
      renderListItemSubtitle={(entry) =>
        entry.author && (
          <span className="text-secondary block truncate text-xs">{entry.author}</span>
        )
      }
      renderDetailPanel={(entry) => (
        <RecipeDetailPanel
          // Remount on entry change so internal state (selected version, comments) resets cleanly
          key={`${entry._source}-${entry.id}`}
          entry={entry}
          bridge={wasmBridge}
          slots={slots}
          onLoadRecipe={onLoadRecipe}
          onDeleteSavedRecipe={onDeleteSavedRecipe}
          onDeleteSavedRecipeVersion={onDeleteSavedRecipeVersion}
          onUpdateSavedRecipeVersionComments={onUpdateSavedRecipeVersionComments}
        />
      )}
    />
  );
}

/** Re-export helpers used by recipes/page.tsx and tests */
export { filterTaggedEntries };
