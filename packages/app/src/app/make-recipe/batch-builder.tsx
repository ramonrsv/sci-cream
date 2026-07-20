"use client";

import { Plus, Trash2 } from "lucide-react";

import type { LightRecipe } from "@workspace/sci-cream";

import { RecipeBadge } from "@/app/_elements/tables/batch-checklist";
import { VersionBadge } from "@/app/_elements/version-badge";
import { MAX_BATCH_RECIPES, type Batch, type BatchRecipe, displayVersion } from "@/lib/batch";
import { makeBatchRows } from "@/lib/batch-share";
import type { SavedRecipeJson } from "@/lib/data";
import { getRecipeStoresFromStorage, makeRecipeId, parseRecipeString } from "@/lib/recipe";

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
  /** Provenance, set only for saved-recipe versions. */
  ref?: BatchRecipe["ref"];
}

/**
 * The owner's working selection: which sources are in the batch, plus the batch metadata. Kept
 * separate from {@link Batch}, which is derived from it and holds the rows themselves.
 */
export interface BatchSelection {
  title?: string;
  date: string;
  notes?: string;
  items: { sourceId: string }[];
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
    // A recipe with only its first version has nothing to tell apart, so it carries no version.
    // Once there are several, every one is labelled — v1 included, now that it can be confused.
    const versioned = recipe.versions.length > 1;
    return [...recipe.versions]
      .reverse()
      .map((version) => ({
        id: `saved:${String(recipe.id)}:${String(version.version)}`,
        name: recipe.name,
        ...(versioned ? { detail: `v${String(version.version)}` } : {}),
        rows: makeBatchRows(version.recipe),
        ref: { recipeId: recipe.id, versionNumber: version.version },
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
  const recipes: BatchRecipe[] = selection.items.flatMap(({ sourceId }) => {
    const source = sources.find((s) => s.id === sourceId);
    if (source === undefined) return [];
    return [{ name: source.name, rows: source.rows, ...(source.ref ? { ref: source.ref } : {}) }];
  });
  return {
    ...(selection.title ? { title: selection.title } : {}),
    date: selection.date,
    ...(selection.notes ? { notes: selection.notes } : {}),
    recipes,
  };
}

/** One row of the builder: the chosen recipe, its total, and a remove control. */
function BuilderRow({
  name,
  version,
  total,
  index,
  onRemove,
}: {
  name: string;
  version?: number;
  total: number;
  index: number;
  onRemove: () => void;
}) {
  return (
    <li
      className="border-brd flex items-center gap-2 border-b py-1.5 last:border-b-0"
      data-testid={`builder-row-${String(index)}`}
    >
      <RecipeBadge index={index} />
      <span className="text-primary min-w-0 flex-1 truncate text-sm">{name}</span>
      {version !== undefined && (
        <VersionBadge version={version} title={`Weighing version ${String(version)}`} />
      )}
      <span className="text-secondary comp-val text-xs tabular-nums">
        {Number(total.toFixed(1))} g
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="action-button px-1 py-0.5"
        title={`Remove ${name}`}
        aria-label={`Remove ${name}`}
        data-testid={`builder-remove-${String(index)}`}
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}

/**
 * Owner-mode batch builder: pick recipes from the calculator slots or saved versions and set the
 * batch metadata. Edits the {@link BatchSelection}; the {@link Batch} is derived.
 */
export function BatchBuilder({
  selection,
  batch,
  sources,
  onChange,
}: {
  selection: BatchSelection;
  batch: Batch;
  sources: BatchSource[];
  onChange: (selection: BatchSelection) => void;
}) {
  const full = selection.items.length >= MAX_BATCH_RECIPES;

  const addSource = (sourceId: string) => {
    if (full || !sources.some((s) => s.id === sourceId)) return;
    onChange({ ...selection, items: [...selection.items, { sourceId }] });
  };

  const removeAt = (index: number) => {
    onChange({ ...selection, items: selection.items.filter((_, i) => i !== index) });
  };

  return (
    <div className="flex flex-col gap-3" data-testid="batch-builder">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-40 flex-1 flex-col gap-1">
          <span className="text-secondary text-xs font-medium tracking-wide uppercase">Title</span>
          <input
            type="text"
            value={selection.title ?? ""}
            onChange={(e) => onChange({ ...selection, title: e.target.value })}
            placeholder="Test batch"
            className="boxed-input my-0 px-1 py-0.5 text-sm"
            data-testid="batch-title"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-secondary text-xs font-medium tracking-wide uppercase">Date</span>
          <input
            type="date"
            value={selection.date}
            onChange={(e) => onChange({ ...selection, date: e.target.value })}
            className="boxed-input my-0 px-1 py-0.5 text-sm"
            data-testid="batch-date"
          />
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-secondary text-xs font-medium tracking-wide uppercase">Recipes</span>
        {batch.recipes.length > 0 && (
          <ul className="flex flex-col">
            {batch.recipes.map((recipe, index) => (
              <BuilderRow
                key={`${String(index)}:${recipe.name}`}
                name={recipe.name}
                version={displayVersion(recipe.ref)}
                total={recipe.rows.reduce((sum, [, quantity]) => sum + quantity, 0)}
                index={index}
                onRemove={() => removeAt(index)}
              />
            ))}
          </ul>
        )}
        <div className="flex items-center gap-1">
          <Plus size={14} className="text-secondary" aria-hidden />
          <label className="flex-1">
            <span className="sr-only">Add a recipe to the batch</span>
            <select
              value=""
              disabled={full || sources.length === 0}
              onChange={(e) => addSource(e.target.value)}
              className="boxed-input my-0 w-full px-1 py-0.5 text-sm"
              data-testid="batch-add-recipe"
            >
              <option value="" disabled>
                {full
                  ? `Batch is full (${String(MAX_BATCH_RECIPES)} recipes)`
                  : sources.length === 0
                    ? "No recipes available — build one in the calculator first"
                    : "Add a recipe…"}
              </option>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.detail === undefined ? source.name : `${source.name} (${source.detail})`}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-secondary text-xs font-medium tracking-wide uppercase">Notes</span>
        <textarea
          value={selection.notes ?? ""}
          onChange={(e) => onChange({ ...selection, notes: e.target.value })}
          placeholder="Procedure notes — ageing, churn temperature, observations…"
          rows={3}
          className="boxed-input my-0 px-1 py-0.5 text-sm"
          data-testid="batch-notes"
        />
      </label>
    </div>
  );
}
