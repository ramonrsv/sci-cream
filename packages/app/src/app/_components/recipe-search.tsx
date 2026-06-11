"use client";

import { useMemo, useState } from "react";
import {
  allRecipeEntries,
  type RecipeEntryJson,
  Bridge as WasmBridge,
  MixProperties,
} from "@workspace/sci-cream";

import { makeRecipeId, type Recipe } from "@/lib/recipe";
import { Select, type SelectOption } from "@/app/_elements/selects/select";
import { RecipeTable } from "@/app/_elements/tables/recipe";
import { PropertiesView } from "@/app/_elements/tables/properties";
import { STD_COMPONENT_H_PX } from "@/lib/styles/sizes";
import { useFreeOnReplace, useSeededWasmResources } from "@/lib/wasm-resources";
import { STATE_VAL } from "@/lib/util";
import { autoLink } from "@/lib/text";
import {
  EntitySearch,
  EntitySource,
  filterTaggedEntries,
  Tagged,
} from "@/app/_components/entity-search";
import {
  DeleteAction,
  DetailPanelHeader,
  EditableComments,
  LoadAction,
} from "@/app/_components/detail-panel";
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

/** Props for {@link RecipeDetailPanel} */
interface RecipeDetailPanelProps extends Pick<
  RecipeSearchProps,
  | "slots"
  | "onLoadRecipe"
  | "onDeleteSavedRecipe"
  | "onDeleteSavedRecipeVersion"
  | "onUpdateSavedRecipeVersionComments"
> {
  entry: TaggedGroupedRecipe;
  bridge: WasmBridge;
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
}: RecipeDetailPanelProps) {
  const { updateIdx: wasmUpdateIdx } = useSeededWasmResources()[STATE_VAL];
  const isSaved = entry._source === EntitySource.Saved;
  const hasMultipleVersions = entry.versions.length > 1;

  const latestIdx = entry.versions.length - 1;
  const [selectedVersionIdx, setSelectedVersionIdx] = useState<number>(latestIdx);
  const selectedVersion = entry.versions[selectedVersionIdx] ?? entry.versions[latestIdx];

  const versionOptions: SelectOption<number>[] = entry.versions.map((v, idx) => ({
    value: idx,
    label: formatVersionOption(v, idx === latestIdx),
  }));

  const recipe = useMemo<Recipe>(
    () => makeRecipeFromRows(entry.name, selectedVersion?.recipe ?? null, bridge),
    [entry, selectedVersion, bridge, wasmUpdateIdx], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Free the prior `MixProperties` once a new recipe replaces it, never the live one (see
  // `useFreeOnReplace` for why freeing in an effect cleanup is unsafe under Strict Mode).
  useFreeOnReplace(recipe.mixProperties);

  const deleteRecipeEnabled = isSaved && !!onDeleteSavedRecipe;

  const deleteVersionEnabled =
    isSaved && hasMultipleVersions && !!onDeleteSavedRecipeVersion && !!selectedVersion;

  const commentsEnabled = isSaved && !!onUpdateSavedRecipeVersionComments && !!selectedVersion;

  return (
    <>
      <DetailPanelHeader
        title={entry.name}
        source={entry._source}
        meta={
          <>
            {entry.author && <span className="text-secondary text-sm">{entry.author}</span>}
            {hasMultipleVersions && (
              <span className="meta-tag">{entry.versions.length} versions</span>
            )}
          </>
        }
      >
        {deleteRecipeEnabled && (
          <DeleteAction
            onDelete={() => onDeleteSavedRecipe(entry)}
            confirmText={`Delete saved recipe "${entry.name}" and all ${entry.versions.length} of its versions?`}
            label="Delete saved recipe"
          />
        )}
        {onLoadRecipe && selectedVersion && (
          <LoadAction
            onLoad={(slot) => onLoadRecipe(entry, selectedVersion, slot)}
            slots={slots}
            slotLabel={makeRecipeId}
          />
        )}
      </DetailPanelHeader>

      {/* Version selector (only when there's more than one version) */}
      {hasMultipleVersions && (
        <div className="flex items-center gap-2">
          <span className="text-secondary text-xs">Version</span>
          <Select
            value={selectedVersionIdx}
            onChange={setSelectedVersionIdx}
            options={versionOptions}
            ariaLabel="Recipe version"
          />
          {deleteVersionEnabled && (
            <DeleteAction
              onDelete={() => onDeleteSavedRecipeVersion(entry, selectedVersion)}
              confirmText={`Delete version ${selectedVersion.version} of "${entry.name}"?`}
              label="Delete this version"
              iconSize={12}
            />
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
        <EditableComments
          // Remount on version change so the textarea re-seeds from the new version's comments
          key={`${entry.id}-v${selectedVersion.version}`}
          initialValue={selectedVersion.comments ?? ""}
          onSave={(comments) =>
            onUpdateSavedRecipeVersionComments(entry, selectedVersion, comments)
          }
          ariaLabel="Recipe comments"
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
