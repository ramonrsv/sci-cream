"use client";

import { Star } from "lucide-react";

import { BatchLegend } from "@/app/_elements/tables/batch-checklist";
import { savedBatchToBatch } from "@/lib/batch/builder";
import { LIST_ITEM_MARKER_ICON_SIZE } from "@/lib/styles/sizes";
import type { SavedBatchJson } from "@/lib/data";

/** Plural noun for a recipe count, so "1 recipe" reads right alongside "3 recipes". */
function recipeCountLabel(count: number): string {
  return `${String(count)} ${count === 1 ? "recipe" : "recipes"}`;
}

/**
 * The user's saved batches, each loadable into the editor; the {@link selectedId} one is marked as
 * being edited. Presentational: the page owns loading and deletion (the latter from the editor).
 */
export function BatchList({
  batches,
  onLoad,
  selectedId,
  emptyMessage = "No saved batches yet. Save one from the Make page.",
}: {
  batches: SavedBatchJson[];
  onLoad: (batch: SavedBatchJson) => void;
  selectedId?: number;
  emptyMessage?: string;
}) {
  if (batches.length === 0) {
    return (
      <p className="text-secondary p-4 text-sm" data-testid="batch-list-empty">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2" data-testid="batch-list">
      {batches.map((saved) => (
        <li
          key={saved.id}
          aria-current={saved.id === selectedId ? "true" : undefined}
          data-testid={`batch-list-item-${String(saved.id)}`}
        >
          <button
            type="button"
            onClick={() => onLoad(saved)}
            className={`search-list-item flex flex-col gap-1.5 ${
              saved.id === selectedId ? "search-list-item-active" : ""
            }`}
            data-testid={`batch-open-${String(saved.id)}`}
          >
            <span className="text-primary block truncate text-sm font-medium">
              {saved.title || "Untitled batch"}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {saved.favourite && (
                <Star
                  size={LIST_ITEM_MARKER_ICON_SIZE}
                  fill="currentColor"
                  className="text-secondary shrink-0"
                  aria-label="Favourite"
                  data-testid="favourite-marker"
                />
              )}
              <span className="meta-tag">{saved.date}</span>
              <span className="text-secondary text-xs">
                {recipeCountLabel(saved.recipes.length)}
              </span>
            </div>
            <BatchLegend recipes={savedBatchToBatch(saved).recipes} />
          </button>
        </li>
      ))}
    </ul>
  );
}
