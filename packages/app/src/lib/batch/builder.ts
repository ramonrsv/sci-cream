import type { LightRecipe } from "@workspace/sci-cream";

import { type Batch, type BatchRecipe, type BatchRecipeVersion } from "@/lib/batch/batch";
import { makeBatchRows } from "@/lib/batch/share";
import type { SavedRecipeJson, SavedRecipeVersionJson } from "@/lib/data/recipes";
import type { BatchInput, SavedBatchJson } from "@/lib/data/batches";
import type { Rating } from "@/lib/rating";
import { getRecipeStoresFromStorage, makeRecipeId, parseRecipeString } from "@/lib/recipe/recipe";
import { type CategoryColor, categoryColorFromName, categoryColorName } from "@/lib/styles/colors";

/** A recipe the picker can add: a calculator slot, or a saved recipe with every version it has. */
export interface AddableRecipe {
  /** Stable identifier, unique across both source kinds: `slot:<n>` or `recipe:<id>`. */
  id: string;
  /** Display name shown in the picker. */
  name: string;
  /** Qualifier beside the name — "R1" for a slot, "3 versions" for a multi-version recipe. */
  detail?: string;
  /** The versions behind it, newest first. A slot has exactly one, carrying no `version`. */
  versions: RecipeSnapshot[];
}

/**
 * One recipe frozen for weighing: what the picker offers and what a {@link BatchSelection} holds.
 * {@link BatchRecipeVersion} says which saved version it is; this carries what it weighs.
 */
export interface RecipeSnapshot {
  /** Display name, as the recipe reads in the batch. */
  name: string;
  /** The `[name, grams]` rows to weigh. */
  rows: LightRecipe;
  /** The saved version this came from. Absent for a calculator slot, which has none. */
  version?: BatchRecipeVersion;
  /**
   * The source version's rating, for the picker label. Kept out of the persisted `version` so the
   * batch reads it live rather than freezing a verdict that may since have changed.
   */
  rating?: Rating;
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
  items: { color?: CategoryColor; recipe: RecipeSnapshot }[];
}

/** Calculator slots holding at least one named row, as batch sources. */
export function readCalculatorSources(): AddableRecipe[] {
  return getRecipeStoresFromStorage().flatMap((store, slot) => {
    const rows: LightRecipe = parseRecipeString(store.serializedRows)
      .filter(([name]) => name !== "")
      .map(([name, quantityStr]) => [name, Number.parseFloat(quantityStr) || 0]);
    if (rows.length === 0) return [];
    const name = store.name || makeRecipeId(slot);
    return [
      { id: `slot:${String(slot)}`, name, detail: makeRecipeId(slot), versions: [{ name, rows }] },
    ];
  });
}

/** Every saved recipe the user can add, each holding its own versions newest first. */
export function readSavedSources(savedRecipes: readonly SavedRecipeJson[]): AddableRecipe[] {
  return savedRecipes.map((recipe) => {
    const hasVersionName = (version: SavedRecipeVersionJson) => version.versionName !== undefined;
    const hasSiblings = recipe.versions.length > 1;

    return {
      id: `recipe:${String(recipe.id)}`,
      name: recipe.name,
      // Qualified by version count; the version itself is chosen on the row afterwards.
      ...(hasSiblings ? { detail: `${String(recipe.versions.length)} versions` } : {}),
      versions: [...recipe.versions]
        .reverse()
        .map((version) => ({
          name: recipe.name,
          rows: makeBatchRows(version.recipe),
          ...(version.rating === undefined ? {} : { rating: version.rating }),
          version: {
            ref: { recipeId: recipe.id, versionNumber: version.version },
            ...(hasVersionName(version) ? { name: version.versionName } : {}),
            hasSiblings,
          },
        })),
    };
  });
}

/** The versions a builder row can switch between, and the one it currently holds. */
export interface VersionChoice {
  /** The live source's versions, newest first. Always more than one. */
  versions: RecipeSnapshot[];
  /** The entry matching the row's snapshot, marked as current in the picker. */
  current: RecipeSnapshot;
}

/**
 * The version choice a builder row offers: its live source's versions, when it has more than one
 * and the row's snapshot is among them. The live source decides, not the snapshot's `hasSiblings`,
 * which freezes at add time. Absent with nothing to switch to, or no way to place its version.
 */
export function findVersionChoice(
  sources: readonly AddableRecipe[],
  recipe: RecipeSnapshot,
): VersionChoice | undefined {
  const ref = recipe.version?.ref;
  if (ref === undefined) return undefined;
  const source = sources.find((s) =>
    s.versions.some((entry) => entry.version?.ref?.recipeId === ref.recipeId),
  );
  if (source === undefined || source.versions.length < 2) return undefined;
  const current = source.versions.find(
    (entry) => entry.version?.ref?.versionNumber === ref.versionNumber,
  );
  return current === undefined ? undefined : { versions: source.versions, current };
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
