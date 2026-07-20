"use client";

import { useEffect, useState } from "react";

import { getLocalStorage, setLocalStorage } from "@/lib/local-storage";

/**
 * Checkoff state for one batch, persisted under a content-derived key.
 *
 * Unlike `usePersistedState`, which restores once on mount, this re-reads whenever `key` changes:
 * the key says which batch is being weighed, so carrying a set across a change would show the wrong
 * checkmarks and overwrite the new batch's progress. Restores in an effect for hydration safety;
 * writes go through the toggle handler, so the empty initial set never lands on stored progress.
 */
export function useChecklistState(key: string): [ReadonlySet<string>, (cell: string) => void] {
  const [checked, setChecked] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    // Reading `localStorage` during render would break hydration, so the sync from that external
    // store has to land here — once on mount, and again only when the batch (the key) changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChecked(new Set(getLocalStorage<string[]>(key) ?? []));
  }, [key]);

  const toggle = (cell: string) => {
    const next = new Set(checked);
    if (!next.delete(cell)) next.add(cell);
    setLocalStorage(key, [...next]);
    setChecked(next);
  };

  return [checked, toggle];
}
