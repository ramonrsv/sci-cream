"use client";

import { useMemo } from "react";
import {
  allRecipeEntries,
  type RecipeEntryJson,
  Bridge as WasmBridge,
  MixProperties,
  type LightRecipe,
} from "@workspace/sci-cream";

import { makeRecipeId, type Recipe } from "@/lib/recipe/recipe";
import { displayVersionName, validateVersionName } from "@/lib/recipe/version";
import { useResetOnChange } from "@/lib/hooks/use-reset-on-change";
import { Select, type SelectOption } from "@/app/_elements/selects/select";
import { RecipeComments, RecipeDetailBody } from "@/app/_elements/recipe-detail-body";
import { ShareRecipeAction } from "@/app/_elements/recipe-share-dialog";
import { DETAIL_PANEL_ACTION_ICON_SIZE } from "@/lib/styles/sizes";
import { STORAGE_KEYS } from "@/lib/local-storage";
import { useFreeOnReplace, useSeededWasmResources } from "@/lib/resources/wasm";
import { STATE_VAL } from "@/lib/util";
import {
  EntitySearch,
  EntitySource,
  filterTaggedEntries,
  Tagged,
  getTaggedEntryKey,
} from "@/app/_components/entity-search";
import {
  DeleteAction,
  DetailPanelHeader,
  EditableComments,
  EditVersionDetailsAction,
  LoadAction,
} from "@/app/_components/detail-panel";
import type { RecipeVersionMeta, SavedRecipeJson, SavedRecipeVersionJson } from "@/lib/data";

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
      {
        version: 1,
        recipe: entry.recipe,
        ...(comments != null && { comments }),
        ...(entry.evaporation ? { evaporation: entry.evaporation } : {}),
        createdAt: "",
      },
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
   * Called when the user saves part of a version's editable details. A field is `null` to clear,
   * a value to set, or omitted to leave unchanged. Parent persists and refreshes `savedRecipes`.
   */
  onUpdateSavedRecipeVersion?: (
    entry: GroupedRecipe,
    version: SavedRecipeVersionJson,
    meta: RecipeVersionMeta,
  ) => void | Promise<void>;
}

/** Props for {@link RecipeDetailPanel} */
interface RecipeDetailPanelProps extends Pick<
  RecipeSearchProps,
  | "slots"
  | "onLoadRecipe"
  | "onDeleteSavedRecipe"
  | "onDeleteSavedRecipeVersion"
  | "onUpdateSavedRecipeVersion"
> {
  entry: TaggedGroupedRecipe;
}

/**
 * Creates a `Recipe` object from a flat `[name, qty][]` recipe and `WasmBridge`, without WASM
 * `Ingredient`s. Used by the detail panel to render the currently selected version.
 */
function makeRecipeFromRows(
  name: string,
  rows: LightRecipe | null,
  bridge: WasmBridge,
  evaporation?: number,
): Recipe {
  const recipe: Recipe = {
    index: 0,
    id: "Value",
    name,
    ingredientRows: rows?.map(([n, quantity], idx) => ({ index: idx, name: n, quantity })) ?? [],
    mixTotal: rows?.reduce((sum, [, quantity]) => sum + quantity, 0) ?? 0,
    evaporation,
    mixProperties: new MixProperties(),
  };

  if (rows) {
    try {
      const computed = bridge.calculate_recipe_mix_properties(
        rows.filter(([n]) => bridge.has_ingredient(n)),
        evaporation,
      );
      recipe.mixProperties.free();
      recipe.mixProperties = computed;
    } catch (err) {
      recipe.mixError = String(err);
    }
  }

  return recipe;
}

/** Build the display label for a version in the dropdown */
function formatVersionOption(v: SavedRecipeVersionJson, isLatest: boolean): string {
  const latest = isLatest ? " · latest" : "";
  const parts = [`v${displayVersionName(v)}`];
  if (v.label) parts.push(v.label);
  return parts.join("  ·  ") + latest;
}

/**
 * Stateful detail panel for a grouped recipe. On entry change the selection resets to the latest
 * version via {@link useResetOnChange} rather than by remounting, so the persisted selects and rows
 * in {@link PropertiesView} keep their restored values instead of flashing defaults.
 */
function RecipeDetailPanel({
  entry,
  slots,
  onLoadRecipe,
  onDeleteSavedRecipe,
  onDeleteSavedRecipeVersion,
  onUpdateSavedRecipeVersion,
}: RecipeDetailPanelProps) {
  const { wasmBridge, updateIdx: wasmUpdateIdx } = useSeededWasmResources()[STATE_VAL];

  const isSaved = entry._source === EntitySource.Saved;
  const hasMultipleVersions = entry.versions.length > 1;
  const latestIdx = entry.versions.length - 1;

  const [selectedVersionIdx, setSelectedVersionIdx] = useResetOnChange(
    getTaggedEntryKey(entry, (e) => `${e.id}-${latestIdx}`),
    latestIdx,
  );
  const selectedVersion = entry.versions[selectedVersionIdx] ?? entry.versions[latestIdx];

  // Newest first: keep each option's index into `entry.versions`, only reverse display order.
  const versionOptions: SelectOption<number>[] = entry.versions
    .map((v, idx) => ({ value: idx, label: formatVersionOption(v, idx === latestIdx) }))
    .reverse();

  const recipe = useMemo<Recipe>(
    () =>
      makeRecipeFromRows(
        entry.name,
        selectedVersion?.recipe ?? null,
        wasmBridge,
        selectedVersion?.evaporation,
      ),
    [entry, selectedVersion, wasmBridge, wasmUpdateIdx], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Free the prior `MixProperties` once a new recipe replaces it, never the live one (see
  // `useFreeOnReplace` for why freeing in an effect cleanup is unsafe under Strict Mode).
  useFreeOnReplace(recipe.mixProperties);

  const deleteRecipeEnabled = isSaved && !!onDeleteSavedRecipe;
  const modVerEnabled = isSaved && !!selectedVersion;
  const deleteVersionEnabled = modVerEnabled && hasMultipleVersions && !!onDeleteSavedRecipeVersion;
  const editVersionEnabled = modVerEnabled && !!onUpdateSavedRecipeVersion;

  /** Validate a typed version name: empty clears it; else grammar, then per-recipe uniqueness. */
  const validateVersionNameField = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (trimmed === "") return undefined;
    return (
      validateVersionName(trimmed) ??
      (entry.versions.some((v) => v !== selectedVersion && v.versionName === trimmed)
        ? "That version already exists"
        : undefined)
    );
  };

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
        {selectedVersion && (
          <ShareRecipeAction
            name={entry.name}
            rows={selectedVersion.recipe}
            evaporation={selectedVersion.evaporation}
            comments={selectedVersion.comments}
            versionName={
              hasMultipleVersions || selectedVersion.versionName
                ? displayVersionName(selectedVersion)
                : undefined
            }
            iconSize={DETAIL_PANEL_ACTION_ICON_SIZE}
          />
        )}
        {onLoadRecipe && selectedVersion && (
          <LoadAction
            onLoad={(slot) => onLoadRecipe(entry, selectedVersion, slot)}
            slots={slots}
            slotLabel={makeRecipeId}
            persistKey={STORAGE_KEYS.recipeSearchLoadAction}
          />
        )}
      </DetailPanelHeader>

      {/* Version select (2+ versions), edit action (any saved version), delete (2+ versions) */}
      <RecipeDetailBody
        recipe={recipe}
        isValidIngredient={(name) => wasmBridge.has_ingredient(name)}
        persistKey={STORAGE_KEYS.recipeSearchPropertiesView}
        toolbarStart={
          hasMultipleVersions || editVersionEnabled ? (
            <div className="flex w-full min-w-0 items-center gap-1">
              {hasMultipleVersions && (
                <Select
                  value={selectedVersionIdx}
                  onChange={setSelectedVersionIdx}
                  options={versionOptions}
                  ariaLabel="Recipe version"
                  className="min-w-0 shrink truncate"
                />
              )}
              {/* Action buttons sit flush-right, fixed-size (`shrink-0`); only the select (which
                  can truncate) gives up space when the two don't both fit; no overflow occurs. */}
              <div className="ml-auto flex shrink-0 items-center gap-1">
                {editVersionEnabled && (
                  <EditVersionDetailsAction
                    // Remount on version change so a still-open popup can't save over the wrong one
                    key={`${entry.id}-v${selectedVersion.version}`}
                    initialName={selectedVersion.versionName ?? ""}
                    initialLabel={selectedVersion.label ?? ""}
                    namePlaceholder={String(selectedVersion.version)}
                    validateName={validateVersionNameField}
                    onSave={({ name, label }) =>
                      onUpdateSavedRecipeVersion(entry, selectedVersion, {
                        versionName: name.trim() === "" ? null : name.trim(),
                        label: label.trim() === "" ? null : label.trim(),
                      })
                    }
                  />
                )}
                {deleteVersionEnabled && (
                  <DeleteAction
                    onDelete={() => onDeleteSavedRecipeVersion(entry, selectedVersion)}
                    confirmText={`Delete version ${selectedVersion.version} of "${entry.name}"?`}
                    label="Delete this version"
                    iconSize={DETAIL_PANEL_ACTION_ICON_SIZE}
                  />
                )}
              </div>
            </div>
          ) : undefined
        }
        comments={
          editVersionEnabled ? (
            <EditableComments
              // Remount on version change so the textarea re-seeds from the newly selected version
              key={`${entry.id}-v${selectedVersion.version}`}
              initialValue={selectedVersion.comments ?? ""}
              ariaLabel="Recipe comments"
              textareaClassName="min-h-58"
              onSave={(value) =>
                onUpdateSavedRecipeVersion(entry, selectedVersion, {
                  comments: value === "" ? null : value,
                })
              }
            />
          ) : (
            selectedVersion?.comments && <RecipeComments text={selectedVersion.comments} />
          )
        }
      />
    </>
  );
}

/**
 * Searchable list of recipes from both the embedded sci-cream dataset and an optional collection of
 * user-saved recipes. Each recipe appears as a single list item regardless of how many versions it
 * has; the detail panel exposes a version selector when more than one version exists. A saved
 * version's name, label, and comments are editable; embedded entries display `comments` read-only.
 */
export function RecipeSearch({
  onLoadRecipe,
  savedRecipes = [],
  slots,
  onDeleteSavedRecipe,
  onDeleteSavedRecipeVersion,
  onUpdateSavedRecipeVersion,
}: RecipeSearchProps) {
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
          entry={entry}
          slots={slots}
          onLoadRecipe={onLoadRecipe}
          onDeleteSavedRecipe={onDeleteSavedRecipe}
          onDeleteSavedRecipeVersion={onDeleteSavedRecipeVersion}
          onUpdateSavedRecipeVersion={onUpdateSavedRecipeVersion}
        />
      )}
    />
  );
}

/** Re-export helpers used by recipes/page.tsx and tests */
export { filterTaggedEntries };
