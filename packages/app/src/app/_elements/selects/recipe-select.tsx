"use client";

import { Recipe } from "@/app/_components/recipe";
import { MAX_RECIPES } from "@/lib/styles/sizes";

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

  return (
    <div id="recipe-selection" className="float-left mx-1">
      <select
        value={currentRecipeIdx}
        onChange={(e) => setCurrentRecipeIdx(parseInt(e.target.value))}
        className="select-input w-fit text-center"
      >
        {enabledRecipeIndices.map((idx) => (
          <option key={idx} value={idx} className="table-inner-cell">
            {allRecipes[idx].name}
          </option>
        ))}
      </select>
    </div>
  );
}
