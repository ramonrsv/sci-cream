"use client";

import { NotebookText } from "lucide-react";

import { Recipe } from "@/lib/recipe/recipe";
import { leafKey } from "@/lib/hooks/use-persisted-state";
import { useRetainedState } from "@/lib/hooks/use-retained-state";
import { SELECT_ICON_SIZE } from "@/lib/styles/sizes";

import { Select, type SelectOption } from "@/app/_elements/selects/select";

/**
 * Retained-state key of the recipe slot selected in the view rooted at `persistKey`, or `undefined`
 * when `persistKey` is, which opts out of retention. {@link useRecipeIdxState} reads it; whatever
 * sets the slot ahead of a navigation, e.g. `useOpenCalculator`, writes it.
 */
export function recipeIdxKey(persistKey: string | undefined): string | undefined {
  return leafKey(persistKey, "recipeIdx");
}

/**
 * Retained `[value, setter]` tuple for the currently displayed recipe slot index, kept under
 * {@link recipeIdxKey}. Deliberately not persisted: a reload returns to `defaultValue`, so it
 * can't leave the view silently on a reference recipe. Plain `useState` without a `persistKey`.
 */
export function useRecipeIdxState(
  persistKey: string | undefined,
  defaultValue: number = 0,
): [number, React.Dispatch<React.SetStateAction<number>>] {
  return useRetainedState(recipeIdxKey(persistKey), defaultValue);
}

/** Name of the {@link RecipeSelect} control, for its accessible name and tooltip. */
const RECIPE_SELECT_LABEL = "Recipe slot";

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
      <Select
        value={currentRecipeIdx}
        onChange={setCurrentRecipeIdx}
        options={options}
        icon={<NotebookText size={SELECT_ICON_SIZE} />}
        ariaLabel={RECIPE_SELECT_LABEL}
        title={`${RECIPE_SELECT_LABEL} (${allRecipes[currentRecipeIdx].id})`}
      />
    </div>
  );
}
