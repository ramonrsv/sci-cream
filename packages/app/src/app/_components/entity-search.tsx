"use client";

import { ReactNode, useMemo, useState } from "react";
import { Search, Trash } from "lucide-react";

import { autoLink } from "@/lib/text";

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
  /** User-owned entries (delete/edit-capable when callbacks are provided) */
  savedEntries: E[];
  /** Stable identifier per entry; used as React key (with `_source`) and selection equality */
  getId: (e: E) => string;
  /** Display name shown as the list-item title and the detail-panel header; defaults to `getId` */
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
  /** Optional badges/labels rendered next to the source tag in the detail header */
  renderHeaderMeta?: (e: Tagged<E>) => ReactNode;
  /** Body of the detail panel; entity-specific content slotted between header and comments */
  renderDetailBody: (e: Tagged<E>) => ReactNode;
  /** Optional id for the outermost wrapper, for tests/CSS targeting */
  id?: string;

  /** Called when the user clicks the load button; passes the selected slot if `slots` is provided */
  onLoad?: (e: E, slot: number) => void;
  /** Label for the load button when `onLoad` is provided; defaults to "Load" */
  loadButtonLabel?: string;
  /** Enabled slot indices for the slot picker; renders the picker only when `length > 1` */
  slots?: number[];
  /** Display label for a slot value; defaults to the numeric slot index */
  slotLabel?: (slot: number) => string;

  /** Called when the user confirms deletion of a saved entry. Saved-only. */
  onDelete?: (e: E) => void | Promise<void>;
  /** Title/aria-label for the delete button; defaults to "Delete saved entry" */
  deleteLabel?: string;
  /** Confirmation prompt for delete; defaults to `Delete saved entry "<display name>"?` */
  getDeleteConfirmText?: (e: E) => string;

  /** Extract the comments string from an entry. Used for both read-only display and edit. */
  getComments?: (e: E) => string | undefined;
  /** Called when the user clicks "Save comments" on a saved entry. Saved-only. */
  onUpdateComments?: (e: E, comments: string) => void | Promise<void>;
  /** Aria-label for the comments textarea; defaults to "Entry comments" */
  commentsLabel?: string;
}

/**
 * Generic searchable two-column list/detail view backing both {@link RecipeSearch} and
 * {@link IngredientSearch}. Owns the search input, source-filter tabs, selection state, and the
 * delete/load/comments wiring; consumers supply the entry list shape and the detail body.
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
  renderHeaderMeta,
  renderDetailBody,
  id,
  onLoad,
  loadButtonLabel = "Load",
  slots,
  slotLabel,
  onDelete,
  deleteLabel = "Delete saved entry",
  getDeleteConfirmText,
  getComments,
  onUpdateComments,
  commentsLabel = "Entry comments",
}: EntitySearchProps<E>) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<EntitySource>(EntitySource.All);
  const [targetSlot, setTargetSlot] = useState(slots?.[0] ?? 0);
  const [selectedEntry, setSelectedEntry] = useState<Tagged<E> | null>(null);
  const [editedComments, setEditedComments] = useState("");

  /** Change selection and re-seed the comments editor from the new entry's persisted comments */
  const selectEntry = (entry: Tagged<E> | null) => {
    if (entry === selectedEntry) return;
    setSelectedEntry(entry);
    setEditedComments(entry && getComments ? (getComments(entry) ?? "") : "");
  };

  // A saved entry is selected and we have a delete callback, so deletion is possible
  const deleteEnabled = selectedEntry?._source === EntitySource.Saved && onDelete;

  const handleDeleteSelected = async () => {
    if (!deleteEnabled)
      throw new Error(
        "handleDeleteSelected invoked without a selected saved entry or a delete callback",
      );

    const confirmText =
      getDeleteConfirmText?.(selectedEntry) ??
      `Delete saved entry "${getDisplayName(selectedEntry)}"?`;
    if (!window.confirm(confirmText)) return;
    await onDelete(selectedEntry);
    selectEntry(null);
  };

  // A saved entry is selected and we have an update callback, so comment editing is possible
  const saveCommentsEnabled = selectedEntry?._source === EntitySource.Saved && onUpdateComments;

  const handleSaveComments = async () => {
    if (!saveCommentsEnabled)
      throw new Error(
        "handleSaveComments invoked without a selected saved entry or an update callback",
      );

    await onUpdateComments(selectedEntry, editedComments);
  };

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

  const comments = selectedEntry && getComments ? getComments(selectedEntry) : undefined;

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
        <div className="flex h-[20vh] shrink-0 flex-col gap-1.5 overflow-y-auto pr-1 [scrollbar-gutter:stable] md:h-auto md:w-60">
          {filtered.length === 0 ? (
            <p className="text-secondary text-sm">{emptyResultsText}</p>
          ) : (
            filtered.map((entry) => (
              <button
                key={`${entry._source}-${getId(entry)}`}
                onClick={() => selectEntry(entry)}
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
            {/* Header: title, badges, action buttons */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <h2 className="text-primary text-base font-semibold">
                  {getDisplayName(selectedEntry)}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  {renderHeaderMeta?.(selectedEntry)}
                  <span className="meta-tag">
                    {selectedEntry._source === EntitySource.Embedded ? "built-in" : "saved"}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {deleteEnabled && (
                  <button
                    onClick={handleDeleteSelected}
                    title={deleteLabel}
                    aria-label={deleteLabel}
                    className="action-button px-2 py-0.5 text-sm"
                  >
                    <Trash size={14} />
                  </button>
                )}
                {onLoad && (
                  <>
                    {slots && slots.length > 1 && (
                      <select
                        value={targetSlot}
                        onChange={(e) => setTargetSlot(parseInt(e.target.value))}
                        className="select-input text-sm"
                      >
                        {slots.map((slot, idx) => (
                          <option key={idx} value={slot}>
                            {slotLabel?.(slot) ?? slot}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={() => onLoad(selectedEntry, targetSlot)}
                      className="action-button px-2 py-0.5 text-sm"
                    >
                      {loadButtonLabel}
                    </button>
                  </>
                )}
              </div>
            </div>

            {renderDetailBody(selectedEntry)}

            {/* Comments — editable for saved entries, read-only for others */}
            {saveCommentsEnabled ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={editedComments}
                  onChange={(e) => setEditedComments(e.target.value)}
                  placeholder="Add comments…"
                  aria-label={commentsLabel}
                  className="table-fillable-input text-secondary min-h-20 rounded-lg px-2 py-1 text-sm leading-relaxed"
                />
                <button
                  onClick={handleSaveComments}
                  className="action-button self-end px-2 py-0.5 text-sm"
                >
                  Save comments
                </button>
              </div>
            ) : (
              comments && (
                <p className="text-secondary text-sm leading-relaxed">{autoLink(comments)}</p>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
