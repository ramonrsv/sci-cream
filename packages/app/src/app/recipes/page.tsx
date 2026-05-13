"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { recipeEntryId, type RecipeEntryJson } from "@workspace/sci-cream";

import { RecipeSearch } from "@/app/_components/recipe-search";
import { MAX_RECIPES } from "@/lib/styles/sizes";
import { getRecipeStoresFromStorage, setRecipeStoresToStorage } from "@/lib/recipe";
import { deleteUserRecipe, fetchAllUserSavedRecipes, updateUserRecipeComments } from "@/lib/data";

/** Recipes page: browse and load recipes from embedded data and the user's from database */
export default function RecipesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [savedRecipes, setSavedRecipes] = useState<RecipeEntryJson[]>([]);

  const userEmail = session?.user?.email;

  useEffect(() => {
    if (userEmail) {
      fetchAllUserSavedRecipes(userEmail).then((recipes) => {
        if (recipes) setSavedRecipes(recipes);
      });
    }
  }, [userEmail]);

  /** Write the entry into the given localStorage slot and navigate to the calculator */
  function handleLoadRecipe(entry: RecipeEntryJson, slotIndex: number) {
    const stores = getRecipeStoresFromStorage();

    stores[slotIndex] = {
      name: recipeEntryId(entry),
      serializedRows: entry.recipe.map(([n, q]) => `${n}\t${q}`).join("\n"),
    };

    setRecipeStoresToStorage(stores);
    router.push(`/calculator?slot=${String(slotIndex)}`);
  }

  /** Delete the entry from the user's saved recipes and refresh the list */
  async function handleDeleteSavedRecipe(entry: RecipeEntryJson) {
    if (!userEmail) return;

    await deleteUserRecipe(userEmail, entry.name);
    const recipes = await fetchAllUserSavedRecipes(userEmail);
    if (recipes) setSavedRecipes(recipes);
  }

  /** Update the comments of a saved recipe and refresh the list */
  async function handleUpdateSavedRecipeComments(entry: RecipeEntryJson, comments: string) {
    if (!userEmail) return;

    await updateUserRecipeComments(userEmail, entry.name, comments);
    const recipes = await fetchAllUserSavedRecipes(userEmail);
    if (recipes) setSavedRecipes(recipes);
  }

  const slots = Array.from({ length: MAX_RECIPES }, (_, idx) => idx);

  return (
    <div className="mx-auto mt-4 max-w-5xl px-1 md:px-4">
      <RecipeSearch
        onLoadRecipe={handleLoadRecipe}
        savedRecipes={savedRecipes}
        slots={slots}
        onDeleteSavedRecipe={userEmail ? handleDeleteSavedRecipe : undefined}
        onUpdateSavedRecipeComments={userEmail ? handleUpdateSavedRecipeComments : undefined}
      />
    </div>
  );
}
