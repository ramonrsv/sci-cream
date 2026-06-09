"use client";

import { Recipe } from "@/lib/recipe";
import { MAX_RECIPES } from "@/lib/styles/sizes";

import { Select, type SelectOption } from "./select";

/** Returns `slot` if it is a valid recipe index, otherwise 0 */
export function recipeSlotOrDefault(slot: number): number {
  return slot >= 0 && slot < MAX_RECIPES && !Number.isNaN(slot) ? slot : 0;
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
    <div id="recipe-selection" className="float-left mx-1">
      <Select
        value={currentRecipeIdx}
        onChange={setCurrentRecipeIdx}
        options={options}
        className="w-fit text-center"
      />
    </div>
  );
}
