"use client";

import { Recipe } from "@/lib/recipe";
import { leafKey, usePersistedState } from "@/lib/use-persisted-state";
import { MAX_RECIPES } from "@/lib/styles/sizes";

import { Select, type SelectOption } from "./select";

/** Returns `slot` if it is a valid recipe index, otherwise 0 */
export function recipeSlotOrDefault(slot: number): number {
  return slot >= 0 && slot < MAX_RECIPES && !Number.isNaN(slot) ? slot : 0;
}

/** `isValid` predicate for a persisted recipe slot — rejects non-numbers and out-of-range slots */
export function isValidSlotStore(n: unknown): n is number {
  return typeof n === "number" && recipeSlotOrDefault(n) === n;
}

/**
 * Parses a raw `?slot=` URL param string into a valid slot index, or `undefined` when the param
 * is absent (`null`). Invalid slot values are clamped to 0 via {@link recipeSlotOrDefault}.
 */
export function slotFromParam(raw: string | null): number | undefined {
  return raw !== null ? recipeSlotOrDefault(parseInt(raw)) : undefined;
}

/**
 * Persisted `[value, setter]` tuple for the currently displayed recipe slot index.
 *
 * When `persistKey` is `undefined`, behaves as plain `useState`. The stored leaf key is
 * `${persistKey}:recipeIdx`. Stored values are validated/clamped via {@link isValidSlotStore}.
 *
 * When `urlSlot` is provided (i.e. `?slot=N` was present in the URL), that value is shown for
 * this mount and storage is bypassed entirely — the remembered slot is neither clobbered nor
 * read. When `urlSlot` is absent, the stored slot is restored as normal.
 */
export function useRecipeIdxState(
  persistKey: string | undefined,
  defaultValue: number = 0,
  { urlSlot }: { urlSlot?: number } = {},
): [number, React.Dispatch<React.SetStateAction<number>>] {
  const effectiveKey = urlSlot !== undefined ? undefined : leafKey(persistKey, "recipeIdx");
  const effectiveDefault = urlSlot !== undefined ? urlSlot : defaultValue;
  return usePersistedState(effectiveKey, effectiveDefault, { isValid: isValidSlotStore });
}

/** Select element for switching between recipes; renders only the enabled indices as options */
export function RecipeSelect({
  allRecipes,
  enabledRecipeIndices,
  currentRecipeIdxState,
}: {
  allRecipes: Recipe[];
  enabledRecipeIndices: number[];
  currentRecipeIdxState: [number, React.Dispatch<React.SetStateAction<number>>];
}) {
  const [currentRecipeIdx, setCurrentRecipeIdx] = currentRecipeIdxState;

  const options: SelectOption<number>[] = enabledRecipeIndices.map((idx) => ({
    value: idx,
    label: allRecipes[idx].id,
  }));

  return (
    <div id="recipe-selection">
      <Select value={currentRecipeIdx} onChange={setCurrentRecipeIdx} options={options} />
    </div>
  );
}
