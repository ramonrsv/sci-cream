import type { LightRecipe } from "@workspace/sci-cream";

import { type Batch, type BatchRecipe, type BatchRecipeVersion } from "@/lib/batch/batch";
import { makeBatchRows } from "@/lib/batch/share";
import type {
  BatchInput,
  SavedBatchJson,
  SavedRecipeJson,
  SavedRecipeVersionJson,
} from "@/lib/data";
import { getRecipeStoresFromStorage, makeRecipeId, parseRecipeString } from "@/lib/recipe/recipe";
import { displayVersionName } from "@/lib/recipe/version";
import { type CategoryColor, categoryColorFromName, categoryColorName } from "@/lib/styles/colors";

/** A recipe the user can add to the batch, from either a calculator slot or a saved version. */
export interface BatchSource {
  /** Stable identifier, unique across both source kinds. */
  id: string;
  /** Display name shown in the picker. */
  name: string;
  /** Qualifier shown beside the name, e.g. "R1" or "v3". Absent when it would say nothing. */
  detail?: string;
  /** The `[name, grams]` rows to weigh. */
  rows: LightRecipe;
  /** The saved version this source came from, when it did. */
  version?: BatchRecipeVersion;
}

/** One recipe carried inline in a {@link BatchSelection}, for a loaded saved batch. */
export interface BatchSelectionRecipe {
  name: string;
  rows: LightRecipe;
  version?: BatchRecipeVersion;
}

/**
 * The owner's working selection: which sources are in the batch, plus the batch metadata. Kept
 * separate from {@link Batch}, which is derived from it and holds the rows themselves.
 */
export interface BatchSelection {
  /** Set once saved to the database; a re-save updates that batch in place. */
  savedBatchId?: number;
  title?: string;
  date: string;
  notes?: string;
  /**
   * Chosen recipes in batch order. An item either references a live source by `sourceId` (the build
   * flow, resolved against `sources`) or carries the recipe inline via `recipe` (a loaded saved
   * batch, which has no live source). `color` is absent only in a selection stored before colors.
   */
  items: { sourceId?: string; color?: CategoryColor; recipe?: BatchSelectionRecipe }[];
}

/** Calculator slots holding at least one named row, as batch sources. */
export function readCalculatorSources(): BatchSource[] {
  return getRecipeStoresFromStorage().flatMap((store, slot) => {
    const rows: LightRecipe = parseRecipeString(store.serializedRows)
      .filter(([name]) => name !== "")
      .map(([name, quantityStr]) => [name, Number.parseFloat(quantityStr) || 0]);
    if (rows.length === 0) return [];
    return [
      {
        id: `slot:${String(slot)}`,
        name: store.name || makeRecipeId(slot),
        detail: makeRecipeId(slot),
        rows,
      },
    ];
  });
}

/** Every saved recipe version the user can add, newest version first within each recipe. */
export function readSavedSources(savedRecipes: readonly SavedRecipeJson[]): BatchSource[] {
  return savedRecipes.flatMap((recipe) => {
    const hasVersionName = (version: SavedRecipeVersionJson) => version.versionName !== undefined;
    const hasSiblings = recipe.versions.length > 1;

    return [...recipe.versions].reverse().map((version) => ({
      id: `saved:${String(recipe.id)}:${String(version.version)}`,
      name: recipe.name,
      // Include a version detail if the recipe has a named version or if it has siblings (so v1
      // is worth naming). The detail is only used in the picker; only `version` rides the link.
      ...(hasSiblings || hasVersionName(version)
        ? { detail: `v${displayVersionName(version)}` }
        : {}),
      rows: makeBatchRows(version.recipe),
      version: {
        ref: { recipeId: recipe.id, versionNumber: version.version },
        ...(hasVersionName(version) ? { name: version.versionName } : {}),
        hasSiblings: recipe.versions.length > 1,
      },
    }));
  });
}

/**
 * Derive the batch from a selection. An inline `recipe` is used as-is (a loaded saved batch);
 * otherwise the item's `sourceId` is resolved against `sources`, dropping any that has since
 * disappeared (a cleared slot, deleted version) — so a stale stored selection degrades gracefully.
 */
export function makeBatchFromSelection(
  selection: BatchSelection,
  sources: readonly BatchSource[],
): Batch {
  const recipes: BatchRecipe[] = selection.items.flatMap(({ sourceId, color, recipe }) => {
    const resolved = recipe ?? sources.find((s) => s.id === sourceId);
    if (resolved === undefined) return [];
    return [
      {
        name: resolved.name,
        rows: resolved.rows,
        ...(resolved.version ? { version: resolved.version } : {}),
        ...(color === undefined ? {} : { color }),
      },
    ];
  });
  return {
    ...(selection.title ? { title: selection.title } : {}),
    date: selection.date,
    ...(selection.notes ? { notes: selection.notes } : {}),
    recipes,
  };
}

/**
 * Project a derived {@link Batch} onto the wire shape stored in the database. Colors are stored by
 * name, and only the version `ref` rides along as provenance — hints are recomputed on load.
 */
export function batchToInput(batch: Batch): BatchInput {
  return {
    ...(batch.title ? { title: batch.title } : {}),
    date: batch.date,
    ...(batch.notes ? { notes: batch.notes } : {}),
    recipes: batch.recipes.map((recipe) => ({
      name: recipe.name,
      rows: recipe.rows,
      ...(recipe.color === undefined ? {} : { color: categoryColorName(recipe.color) }),
      ...(recipe.version?.ref ? { ref: recipe.version.ref } : {}),
    })),
  };
}

/** A saved batch as a derived {@link Batch}, for read-only display (e.g. the saved-batch list). */
export function savedBatchToBatch(saved: SavedBatchJson): Batch {
  return makeBatchFromSelection(selectionFromSavedBatch(saved), []);
}

/**
 * Seed an owner-mode selection from a saved batch: every recipe is carried inline (no live source
 * to resolve against), and `savedBatchId` marks it for update in place on the next save.
 */
export function selectionFromSavedBatch(saved: SavedBatchJson): BatchSelection {
  return {
    savedBatchId: saved.id,
    ...(saved.title ? { title: saved.title } : {}),
    date: saved.date,
    ...(saved.notes ? { notes: saved.notes } : {}),
    items: saved.recipes.map((recipe) => {
      const color = categoryColorFromName(recipe.color);
      return {
        ...(color === undefined ? {} : { color }),
        recipe: {
          name: recipe.name,
          rows: recipe.rows,
          ...(recipe.ref ? { version: { ref: recipe.ref } } : {}),
        },
      };
    }),
  };
}
