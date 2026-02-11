"use client";

import { Recipe } from "@/app/recipe";

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
