"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { recipeEntryId, type RecipeEntryJson } from "@workspace/sci-cream";

import { RecipeSearch } from "@/app/_components/recipe-search";
import { MAX_RECIPES } from "@/lib/styles/sizes";
import { getRecipeStoresFromStorage, setRecipeStoresToStorage } from "@/lib/recipe";
import { deleteUserRecipe, fetchAllUserSavedRecipes } from "@/lib/data";

/** Recipes page: browse and load recipes from embedded data and the user's from database */
export default function RecipesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [savedRecipes, setSavedRecipes] = useState<RecipeEntryJson[]>([]);

  useEffect(() => {
    if (session?.user?.email) {
      fetchAllUserSavedRecipes(session.user.email).then((recipes) => {
        if (recipes) setSavedRecipes(recipes);
      });
    }
  }, [session?.user?.email]);

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
    const email = session?.user?.email;
    if (!email) return;
    await deleteUserRecipe(email, entry.name);
    const recipes = await fetchAllUserSavedRecipes(email);
    if (recipes) setSavedRecipes(recipes);
  }

  const slots = Array.from({ length: MAX_RECIPES }, (_, idx) => idx);

  return (
    <div className="mx-auto mt-4 max-w-5xl px-1 md:px-4">
      <RecipeSearch
        onLoadRecipe={handleLoadRecipe}
        savedRecipes={savedRecipes}
        slots={slots}
        onDeleteSavedRecipe={session?.user?.email ? handleDeleteSavedRecipe : undefined}
      />
    </div>
  );
}
