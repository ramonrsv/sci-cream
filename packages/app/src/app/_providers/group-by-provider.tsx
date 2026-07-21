"use client";

import { GroupBy, GroupByContext, isGroupBy } from "@/lib/group-by";
import { STORAGE_KEYS } from "@/lib/local-storage";
import { usePersistedState } from "@/lib/use-persisted-state";

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
