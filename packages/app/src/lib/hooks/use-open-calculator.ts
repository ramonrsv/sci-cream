"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { recipeIdxKey } from "@/app/_elements/selects/recipe-select";
import { useRetainedStateSetter } from "@/lib/hooks/use-retained-state";
import { STORAGE_KEYS } from "@/lib/local-storage";

/**
 * Returns a function that opens the calculator with its recipe editor on `slot`.
 *
 * The slot is passed through the retained store, not a `?slot=` URL param, which Back and Forward
 * would re-apply over any slot selected since.
 */
export function useOpenCalculator(): (slot: number) => void {
  const router = useRouter();
  const setRetained = useRetainedStateSetter();

  return useCallback(
    (slot) => {
      setRetained(recipeIdxKey(STORAGE_KEYS.recipeEditorPanel), slot);
      router.push("/calculator");
    },
    [router, setRetained],
  );
}
