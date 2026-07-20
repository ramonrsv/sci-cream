import type { LightRecipe } from "@workspace/sci-cream";

import type { SavedRecipeRef } from "@/lib/recipe";
import {
  STORAGE_KEYS,
  getLocalStorage,
  removeLocalStorage,
  setLocalStorage,
} from "@/lib/local-storage";

/**
 * A make-recipe batch: one weighing session covering one or more recipes, made on a given day.
 * This is the experiment draft: `date` and `notes` map onto a future experiment row unchanged.
 */
export interface Batch {
  /** Optional batch title, e.g. "Test batch 2026-07-05". */
  title?: string;
  /** Calendar day the batch is made, `YYYY-MM-DD` in the author's local time — not a timestamp. */
  date: string;
  /** Free-text notes about the procedure. */
  notes?: string;
  /** Recipes in batch order; order drives the badge letter and hue. */
  recipes: BatchRecipe[];
}

/** One recipe within a {@link Batch}. */
export interface BatchRecipe {
  /** Display name, shown in the legend and on badges. */
  name: string;
  /** `[name, grams]` rows, exactly as they are to be weighed. */
  rows: LightRecipe;
  /** Source saved version, when the recipe came from one. Provenance only — never amounts. */
  ref?: SavedRecipeRef;
}

/** The version every saved recipe starts at. It distinguishes nothing, so it is never shown. */
export const DEFAULT_RECIPE_VERSION = 1;

/**
 * The version worth showing beside a recipe name: absent for a calculator slot, which has none, and
 * for the default, which distinguishes nothing.
 *
 * Owner-side only — `ref` is deliberately kept off the wire, so a recipient sees no version.
 */
export function displayVersion(ref: BatchRecipe["ref"]): number | undefined {
  if (ref === undefined || ref.versionNumber === DEFAULT_RECIPE_VERSION) return undefined;
  return ref.versionNumber;
}

/** Maximum recipes in one batch; matches the palette size so every recipe gets its own hue. */
export const MAX_BATCH_RECIPES = 8;

/** Maximum stored per-batch checklists before the least recently used are evicted. */
export const MAX_STORED_CHECKLISTS = 20;

/** One ingredient across the whole batch, with the per-recipe amounts that make up its total. */
export interface MergedRow {
  /** Ingredient name; rows merge on an exact match. */
  name: string;
  /** Sum of every recipe's amount for this ingredient. */
  total: number;
  /** Per-recipe amounts, in batch order; only recipes that use the ingredient appear. */
  cells: MergedCell[];
}

/** One recipe's contribution to a {@link MergedRow} — the unit of weighing and of checkoff. */
export interface MergedCell {
  /** Index of the source recipe in `Batch.recipes`; drives the badge letter and hue. */
  recipeIndex: number;
  /** Grams of this ingredient to weigh for that recipe. */
  quantity: number;
}

/**
 * Merge a batch's recipes into one weighing checklist, keyed by exact ingredient name. Rows appear
 * in first-appearance order across recipes, so the list follows how the author built them.
 *
 * A name repeated within a single recipe sums into that recipe's one cell, so each (recipe,
 * ingredient) pair stays a single unit of work.
 */
export function mergeBatchRows(recipes: readonly BatchRecipe[]): MergedRow[] {
  const merged = new Map<string, MergedRow>();
  recipes.forEach(({ rows }, recipeIndex) => {
    for (const [name, quantity] of rows) {
      let row = merged.get(name);
      if (row === undefined) {
        row = { name, total: 0, cells: [] };
        merged.set(name, row);
      }
      row.total += quantity;
      const cell = row.cells.find((c) => c.recipeIndex === recipeIndex);
      if (cell === undefined) row.cells.push({ recipeIndex, quantity });
      else cell.quantity += quantity;
    }
  });
  return [...merged.values()];
}

/** Badge letter for the `index`-th recipe in a batch: A, B, C, … */
export function batchRecipeLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

/** Stable identifier for one checkoff cell, used as the key into the checked set. */
export function cellKey(rowName: string, recipeIndex: number): string {
  return `${String(recipeIndex)}:${rowName}`;
}

/** Today's date as `YYYY-MM-DD` in the local timezone, for defaulting {@link Batch.date}. */
export function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${String(now.getFullYear())}-${month}-${day}`;
}

/**
 * Canonical weighing content of a batch: the fields whose change invalidates weighing progress.
 * Deliberately excludes title, date, notes and refs — editing those must not discard
 * checkmarks — and excludes the payload version so a future bump preserves progress.
 *
 * Separators are control characters, untypeable in a name, so no name can forge a boundary.
 */
export function canonicalBatchContent(batch: Batch): string {
  return batch.recipes
    .map(({ name, rows }) => [name, ...rows.map(([n, q]) => `${n}=${q.toFixed(3)}`)].join("\u001f"))
    .join("\u001e");
}

/**
 * FNV-1a over UTF-16 code units, as base 36. A collision merely merges two checklists' checkoff
 * state, so 32 bits suffice. `Math.imul` is required: plain `*` loses precision past 2^53 and
 * silently degenerates the hash.
 */
export function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/**
 * `localStorage` key holding a batch's checkoff state. Identical for the owner and every recipient
 * of the link, since it hashes only content both sides share.
 *
 * The `h` prefix keeps hashes out of the sibling suffix space — `"index"` is itself valid base 36.
 */
export function batchChecklistKey(batch: Batch): string {
  return `${STORAGE_KEYS.makeRecipeChecklist}:h${fnv1a32(canonicalBatchContent(batch))}`;
}

/** Key of the MRU index listing stored checklist hashes, most recently touched first. */
function checklistIndexKey(): string {
  return `${STORAGE_KEYS.makeRecipeChecklist}:index`;
}

/**
 * Record `checklistKey` as most recently used and evict checklists past
 * {@link MAX_STORED_CHECKLISTS}, so abandoned batches don't accumulate forever. Call on batch
 * change, not on every checkbox toggle.
 *
 * The index can drift from reality (another tab, manual clearing), orphaning a data key until the
 * index names it again; harmless, and cheaper than sweeping all of `localStorage`.
 */
export function touchChecklist(checklistKey: string): void {
  const index = getLocalStorage<string[]>(checklistIndexKey()) ?? [];
  const next = [checklistKey, ...index.filter((k) => k !== checklistKey)];
  for (const stale of next.splice(MAX_STORED_CHECKLISTS)) removeLocalStorage(stale);
  setLocalStorage(checklistIndexKey(), next);
}
