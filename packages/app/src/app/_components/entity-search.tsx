"use client";

import { ReactNode, useMemo, useState } from "react";
import { Search } from "lucide-react";

/** Sources of entries displayed by an {@link EntitySearch}, including `All` */
export enum EntitySource {
  All = "all",
  Embedded = "embedded",
  Saved = "saved",
}

/** An entry tagged with its source (Embedded or Saved), used for source filtering and badging */
export type Tagged<E> = E & { _source: EntitySource.Embedded | EntitySource.Saved };

/**
 * Merge, tag, and filter entries by source and a free-text query.
 *
 * `matchesQuery` is invoked with a lowercased query and is expected to do case-insensitive matching
 * against whatever fields are meaningful for the entity (e.g. name, author, category).
 */
export function filterTaggedEntries<E>(
  embeddedEntries: E[],
  savedEntries: E[],
  source: EntitySource,
  query: string,
  matchesQuery: (e: E, q: string) => boolean,
): Tagged<E>[] {
  const all: Tagged<E>[] = [
    ...embeddedEntries.map((e): Tagged<E> => ({ ...e, _source: EntitySource.Embedded })),
    ...savedEntries.map((e): Tagged<E> => ({ ...e, _source: EntitySource.Saved })),
  ];

  const pool = source === EntitySource.All ? all : all.filter((e) => e._source === source);

  if (!query.trim()) return pool;
  const q = query.toLowerCase();
  return pool.filter((e) => matchesQuery(e, q));
}

/** Props for {@link EntitySearch} */
export interface EntitySearchProps<E> {
  /** Read-only built-in entries (e.g. embedded data) */
  embeddedEntries: E[];
  /** User-owned entries */
  savedEntries: E[];
  /** Stable identifier per entry; used as React key (with `_source`) and selection equality */
  getId: (e: E) => string;
  /** Display name shown as the list-item title; defaults to `getId` */
  getDisplayName?: (e: E) => string;
  /** Case-insensitive query match predicate; `q` is already lowercased */
  matchesQuery: (e: E, q: string) => boolean;
  /** Optional placeholder text for the search input */
  searchPlaceholder?: string;
  /** Optional text shown in the right panel when no entry is selected */
  emptyDetailText?: string;
  /** Optional text shown in the list when no entries match the current query/source */
  emptyResultsText?: string;
  /** Optional second-line content under each list-item title (e.g. author, category) */
  renderListItemSubtitle?: (e: Tagged<E>) => ReactNode;
  /**
   * Renders the entire content of the detail panel — header, body, actions, comments. EntitySearch
   * owns the outer container and the empty state; everything inside is the consumer's. Compose with
   * the atoms in `@/app/_components/detail-panel` (DetailPanelHeader, LoadAction, DeleteAction,
   * EditableComments) for a consistent look across entity types.
   */
  renderDetailPanel: (e: Tagged<E>) => ReactNode;
  /** Optional id for the outermost wrapper, for tests/CSS targeting */
  id?: string;
}

/**
 * Generic searchable two-column list/detail shell. Owns the search input, source-filter tabs,
 * list selection, and the detail-panel container; the consumer renders the panel content via
 * {@link EntitySearchProps.renderDetailPanel} (typically composing the atoms in `detail-panel.tsx`).
 *
 * Used by {@link RecipeSearch} and {@link IngredientSearch}.
 */
export function EntitySearch<E>({
  embeddedEntries,
  savedEntries,
  getId,
  getDisplayName = getId,
  matchesQuery,
  searchPlaceholder = "Search…",
  emptyDetailText = "Select an entry to see details",
  emptyResultsText = "No entries found.",
  renderListItemSubtitle,
  renderDetailPanel,
  id,
}: EntitySearchProps<E>) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<EntitySource>(EntitySource.All);
  const [selectedEntry, setSelectedEntry] = useState<Tagged<E> | null>(null);

  const filtered = useMemo(
    () => filterTaggedEntries(embeddedEntries, savedEntries, source, query, matchesQuery),
    [embeddedEntries, savedEntries, source, query, matchesQuery],
  );

  const sourceOptions: { value: EntitySource; label: string }[] = [
    { value: EntitySource.All, label: "All" },
    { value: EntitySource.Embedded, label: "Built-in" },
    { value: EntitySource.Saved, label: "Saved" },
  ];

  const isSelected = (entry: Tagged<E>) =>
    selectedEntry !== null &&
    selectedEntry._source === entry._source &&
    getId(selectedEntry) === getId(entry);

  return (
    <div id={id} className="flex flex-col gap-3">
      {/* Search bar + source filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={14}
            className="text-secondary pointer-events-none absolute top-1/2 left-2 -translate-y-1/2"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="table-fillable-input w-full rounded-lg py-1 pr-2 pl-7"
          />
        </div>
        <div className="flex">
          {sourceOptions.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSource(value)}
              className={`action-button px-2 py-0.5 text-sm ${
                source === value ? "border-brd-lt dark:border-brd-dk font-medium" : ""
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col gap-4 md:h-[75vh] md:flex-row">
        {/* Left: list */}
        <div className="flex h-[20vh] shrink-0 scrollbar-gutter-stable flex-col gap-1.5 overflow-y-auto pr-1 md:h-auto md:w-60">
          {filtered.length === 0 ? (
            <p className="text-secondary text-sm">{emptyResultsText}</p>
          ) : (
            filtered.map((entry) => (
              <button
                key={`${entry._source}-${getId(entry)}`}
                onClick={() => setSelectedEntry(entry)}
                className={`search-list-item ${isSelected(entry) ? "search-list-item-active" : ""}`}
              >
                <span className="text-primary block truncate text-sm font-medium">
                  {getDisplayName(entry)}
                </span>
                {renderListItemSubtitle?.(entry)}
              </button>
            ))
          )}
        </div>

        {/* Right: detail panel */}
        {selectedEntry === null ? (
          <div className="search-empty">{emptyDetailText}</div>
        ) : (
          <div className="search-detail-panel" data-testid="search-detail-panel">
            {renderDetailPanel(selectedEntry)}
          </div>
        )}
      </div>
    </div>
  );
}
