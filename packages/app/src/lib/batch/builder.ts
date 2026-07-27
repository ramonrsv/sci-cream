import type { LightRecipe } from "@workspace/sci-cream";

import { type Batch, type BatchRecipe, type BatchRecipeVersion } from "@/lib/batch/batch";
import { makeBatchRows } from "@/lib/batch/share";
import type { SavedRecipeJson, SavedRecipeVersionJson } from "@/lib/data";
import { getRecipeStoresFromStorage, makeRecipeId, parseRecipeString } from "@/lib/recipe/recipe";
import { displayVersionName } from "@/lib/recipe/version";
import type { CategoryColor } from "@/lib/styles/colors";

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

/**
 * The owner's working selection: which sources are in the batch, plus the batch metadata. Kept
 * separate from {@link Batch}, which is derived from it and holds the rows themselves.
 */
export interface BatchSelection {
  title?: string;
  date: string;
  notes?: string;
  /** Chosen sources in batch order; `color` is absent only in a selection stored before colors. */
  items: { sourceId: string; color?: CategoryColor }[];
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
 * Derive the batch from a selection. Selected sources that have since disappeared (a cleared slot,
 * deleted version) are dropped, so a stale stored selection degrades to recipes that still exist.
 */
export function makeBatchFromSelection(
  selection: BatchSelection,
  sources: readonly BatchSource[],
): Batch {
  const recipes: BatchRecipe[] = selection.items.flatMap(({ sourceId, color }) => {
    const source = sources.find((s) => s.id === sourceId);
    if (source === undefined) return [];
    return [
      {
        name: source.name,
        rows: source.rows,
        ...(source.version ? { version: source.version } : {}),
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
