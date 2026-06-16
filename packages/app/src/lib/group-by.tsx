"use client";

import { createContext, useContext } from "react";

import type { GroupOptions } from "@workspace/sci-cream";

import { STORAGE_KEYS } from "@/lib/local-storage";
import { usePersistedState } from "@/lib/use-persisted-state";

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

/** An enabled key placed in hierarchy display order, carrying its depth and roll-up flag. */
export interface OrderedKeyRow<Key> {
  /** The key. */
  key: Key;
  /** Indentation depth, counting only enabled ancestors so nesting stays contiguous. */
  depth: number;
  /** Whether this key is a roll-up (has enabled descendants) — a group-heading row. */
  isRollup: boolean;
}

/**
 * Builds the current grouping's key-ordering callback, or `undefined` when {@link GroupBy} is flat.
 *
 * `groupKeys` adapts the shared `groupEnabledKeys` to the caller's key space (`PropKey` directly,
 * `CompKey` via a small adapter), keeping this hook agnostic of the key type a view renders.
 */
export function useOrderKeys<Key>(
  groupKeys: (keys: Key[], options: GroupOptions) => OrderedKeyRow<Key>[],
): ((keys: Key[]) => OrderedKeyRow<Key>[]) | undefined {
  const { groupBy } = useGroupBy();
  return isGrouped(groupBy)
    ? (keys) => groupKeys(keys, { duplicates: groupsWithDuplicates(groupBy) })
    : undefined;
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
  const [groupBy, setGroupBy] = usePersistedState<GroupBy>(
    STORAGE_KEYS.groupBy,
    GroupBy.Ungrouped,
    { isValid: isGroupBy },
  );

  return <GroupByContext value={{ groupBy, setGroupBy }}>{children}</GroupByContext>;
}
