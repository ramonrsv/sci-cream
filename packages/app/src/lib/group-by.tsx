"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { getLocalStorage, setLocalStorage, STORAGE_KEYS } from "@/lib/local-storage";

/**
 * How a property/composition list is grouped under its roll-up headings.
 *
 * This is a global, app-wide display preference (like the theme): every key list — properties
 * table, composition breakdown, the key-filter customize popup, charts — reads the same value via
 * {@link useGroupBy}, so a user configures grouping once and it applies everywhere consistently.
 */
export enum GroupBy {
  /** Flat list — no grouping. */
  Ungrouped = "Ungrouped",
  /** Group under roll-ups; a shared key shows once, under its first roll-up. */
  GroupedOnce = "GroupedOnce",
  /** Group under roll-ups; a shared key repeats under every roll-up it belongs to. */
  GroupedRepeat = "GroupedRepeat",
}

/** Human-readable label for each grouping option. */
export const GROUP_BY_LABELS: Record<GroupBy, string> = {
  [GroupBy.Ungrouped]: "Flat",
  [GroupBy.GroupedOnce]: "Groups (unique)",
  [GroupBy.GroupedRepeat]: "Groups (repeated)",
};

/** Whether `groupBy` arranges keys under roll-up headings (vs. a flat list). */
export function isGrouped(groupBy: GroupBy): boolean {
  return groupBy !== GroupBy.Ungrouped;
}

/** Whether `groupBy` repeats a shared key under each roll-up it belongs to. */
export function groupsWithDuplicates(groupBy: GroupBy): boolean {
  return groupBy === GroupBy.GroupedRepeat;
}

/** Returns `true` when `value` is a valid {@link GroupBy} enum value. */
function isGroupBy(value: unknown): value is GroupBy {
  return (Object.values(GroupBy) as unknown[]).includes(value);
}

/** Context carrying the global grouping preference and its setter. */
const GroupByContext = createContext<{ groupBy: GroupBy; setGroupBy: (groupBy: GroupBy) => void }>({
  groupBy: GroupBy.Ungrouped,
  setGroupBy: () => {},
});

/** Hook to read the global grouping preference and its setter from any descendant component. */
export function useGroupBy() {
  return useContext(GroupByContext);
}

/**
 * Provider for the global {@link GroupBy} preference, persisted to `localStorage`.
 *
 * Starts at {@link GroupBy.Ungrouped} so the first client render matches the server, then restores
 * the persisted choice in mount effect; applying it during render would risk a hydration mismatch.
 */
export function GroupByProvider({ children }: { children: React.ReactNode }) {
  const [groupBy, setGroupByState] = useState<GroupBy>(GroupBy.Ungrouped);

  useEffect(() => {
    const stored = getLocalStorage<GroupBy>(STORAGE_KEYS.groupBy);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe restore
    if (isGroupBy(stored)) setGroupByState(stored);
  }, []);

  const setGroupBy = useCallback((value: GroupBy) => {
    setGroupByState(value);
    setLocalStorage(STORAGE_KEYS.groupBy, value);
  }, []);

  return <GroupByContext value={{ groupBy, setGroupBy }}>{children}</GroupByContext>;
}
