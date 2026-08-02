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
export interface AddableRecipe {
  /** Stable identifier, unique across both source kinds. */
  id: string;
  /** Display name shown in the picker. */
  name: string;
  /** Qualifier shown beside the name, e.g. "R1" or "v3". Absent when it would say nothing. */
  detail?: string;
  /** The `[name, grams]` rows to weigh. */
  rows: LightRecipe;
  /** The saved version this recipe came from, when it did. */
  version?: BatchRecipeVersion;
}

/** A recipe selected into a {@link BatchSelection}: a snapshot frozen when added or loaded. */
export interface SelectedRecipe {
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
   * Chosen recipes in batch order, each snapshotting its recipe inline so later edits to the source
   * it came from never change it. `color` is absent only in a selection stored before colors.
   */
  items: { color?: CategoryColor; recipe: SelectedRecipe }[];
}

/** Calculator slots holding at least one named row, as batch sources. */
export function readCalculatorSources(): AddableRecipe[] {
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
export function readSavedSources(savedRecipes: readonly SavedRecipeJson[]): AddableRecipe[] {
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
 * Snapshot an {@link AddableRecipe} into a {@link SelectedRecipe}, capturing its rows at add time
 * so the batch stops tracking later edits to the calculator slot or saved version it came from.
 */
export function snapshotRecipe(source: AddableRecipe): SelectedRecipe {
  return {
    name: source.name,
    rows: source.rows,
    ...(source.version ? { version: source.version } : {}),
  };
}

/**
 * Whether a persisted selection predates inline snapshots. Older drafts referenced a live source by
 * id and carry no rows; rejecting one falls the hook back to an empty batch, not a broken one.
 */
export function isInlineSelection(selection: BatchSelection): boolean {
  return selection.items.every((item) => item.recipe !== undefined);
}

/**
 * Derive the batch from a selection. Every item carries its recipe inline, so the batch is a stable
 * record — unaffected by later edits to the calculator slot or saved version a recipe came from.
 */
export function makeBatchFromSelection(selection: BatchSelection): Batch {
  const recipes: BatchRecipe[] = selection.items.map(({ color, recipe }) => ({
    name: recipe.name,
    rows: recipe.rows,
    ...(recipe.version ? { version: recipe.version } : {}),
    ...(color === undefined ? {} : { color }),
  }));
  return {
    ...(selection.title ? { title: selection.title } : {}),
    date: selection.date,
    ...(selection.notes ? { notes: selection.notes } : {}),
    recipes,
  };
}

/**
 * Project a derived {@link Batch} onto the wire shape stored in the database. Colors are stored by
 * name; `version` (ref plus its display hints) rides along as-is, snapshotted for storage.
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
      ...(recipe.version ? { version: recipe.version } : {}),
    })),
  };
}

/** A saved batch as a derived {@link Batch}, for read-only display (e.g. the saved-batch list). */
export function savedBatchToBatch(saved: SavedBatchJson): Batch {
  return makeBatchFromSelection(selectionFromSavedBatch(saved));
}

/** Case-insensitive match of a saved batch: title, date, notes, and recipe/ingredient names. */
export function batchMatchesQuery(batch: SavedBatchJson, q: string): boolean {
  if ((batch.title ?? "").toLowerCase().includes(q)) return true;
  if (batch.date.includes(q)) return true;
  if ((batch.notes ?? "").toLowerCase().includes(q)) return true;
  return batch.recipes.some(
    (recipe) =>
      recipe.name.toLowerCase().includes(q) ||
      recipe.rows.some(([name]) => name.toLowerCase().includes(q)),
  );
}

/** Any recipe, title, or notes the user has put into the batch — the "worth keeping" test. */
function batchHasContent(batch: Batch): boolean {
  return (
    batch.recipes.length > 0 ||
    (batch.title ?? "").trim() !== "" ||
    (batch.notes ?? "").trim() !== ""
  );
}

/** Stable content fingerprint of a batch, for detecting edits against a saved baseline. */
function batchFingerprint(batch: Batch): string {
  return JSON.stringify({
    title: batch.title ?? "",
    date: batch.date,
    notes: batch.notes ?? "",
    recipes: batch.recipes.map((recipe) => ({
      name: recipe.name,
      rows: recipe.rows,
      color: recipe.color ?? null,
      ref: recipe.version?.ref ?? null,
    })),
  });
}

/**
 * Whether discarding the derived {@link Batch} (e.g. via "New batch") would lose work: an unbound
 * draft once it has any recipe, title, or notes; a bound one only where it diverges from its saved
 * batch. Compares resolved batches, so a source ref and a loaded inline recipe read alike.
 */
export function batchHasUnsavedChanges(
  batch: Batch,
  savedBatchId: number | undefined,
  savedBatches: readonly SavedBatchJson[],
): boolean {
  if (savedBatchId === undefined) return batchHasContent(batch);
  const saved = savedBatches.find((b) => b.id === savedBatchId);
  if (saved === undefined) return batchHasContent(batch);
  return batchFingerprint(batch) !== batchFingerprint(savedBatchToBatch(saved));
}

/**
 * Seed an owner-mode selection from a saved batch: every recipe is carried inline (no live source
 * to resolve against), and `savedBatchId` marks it for update in place on the next save. `version`
 * is already snapshotted, so it survives even once the source has since been edited or deleted.
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
          ...(recipe.version ? { version: recipe.version } : {}),
        },
      };
    }),
  };
}
