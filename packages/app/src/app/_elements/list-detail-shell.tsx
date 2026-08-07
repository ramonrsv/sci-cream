"use client";

import { ReactNode } from "react";
import { Search } from "lucide-react";

/** Props for {@link ListDetailShell} */
export interface ListDetailShellProps {
  /** Current search query; the shell renders a controlled input, the consumer owns filtering. */
  query: string;
  /** Called with the new query on every keystroke. */
  onQueryChange: (query: string) => void;
  /** Placeholder text for the search input. */
  searchPlaceholder?: string;
  /** Content rendered to the right of the search input (e.g. source-filter tabs, a New button). */
  toolbarRight?: ReactNode;
  /** Left-column content: the list items and its own empty state. */
  list: ReactNode;
  /** Right-column content: the detail panel, or a consumer-supplied empty state. */
  detail: ReactNode;
  /** Optional id for the outermost wrapper, for tests/CSS targeting. */
  id?: string;
}

/**
 * Presentational two-column list/detail layout: a search input with an optional toolbar above a
 * scrollable left list and a right detail column. Purely structural — it owns no query, selection,
 * or filtering state; the consumer passes {@link ListDetailShellProps.list} and `detail` as content
 * and controls the search input via `query`/`onQueryChange`.
 *
 * Shared by {@link EntitySearch} (browse of embedded + saved entries) and the make-recipe page.
 */
export function ListDetailShell({
  query,
  onQueryChange,
  searchPlaceholder = "Search…",
  toolbarRight,
  list,
  detail,
  id,
}: ListDetailShellProps) {
  return (
    <div id={id} className="flex flex-col gap-3">
      {/* Search bar + optional toolbar; the toolbar wraps below rather than squeezing the input */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-50 flex-1">
          <Search
            size={14}
            className="text-secondary pointer-events-none absolute top-1/2 left-2 -translate-y-1/2"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="table-fillable-input w-full rounded-lg py-1 pr-2 pl-7"
          />
        </div>
        {/* `ml-auto` keeps it pinned right on the row it lands on, first or wrapped. */}
        {toolbarRight && (
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {toolbarRight}
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col gap-4 md:h-[75vh] md:flex-row">
        {/* Left: list */}
        <div className="flex h-[20vh] shrink-0 scrollbar-gutter-stable flex-col gap-1.5 overflow-y-auto pr-1 md:h-auto md:w-60">
          {list}
        </div>
        {/* Right: detail panel */}
        {detail}
      </div>
    </div>
  );
}
