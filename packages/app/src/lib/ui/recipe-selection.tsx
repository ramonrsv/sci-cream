"use client";

import { Recipe } from "@/app/recipe";
import { recipeCompBgColor } from "../styles/colors";

export function RecipeSelection({
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
    <div id="recipe-selection" className="float-left mr-2">
      <select
        value={currentRecipeIdx}
        onChange={(e) => setCurrentRecipeIdx(parseInt(e.target.value))}
        className="select-input w-fit text-center"
        style={{ backgroundColor: recipeCompBgColor(currentRecipeIdx) }}
      >
        {enabledRecipeIndices.map((idx) => (
          <option key={idx} value={idx} style={{ backgroundColor: recipeCompBgColor(idx) }}>
            {allRecipes[idx].name}
          </option>
        ))}
      </select>
    </div>
  );
}
