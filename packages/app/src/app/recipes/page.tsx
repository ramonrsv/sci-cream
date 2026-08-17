"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { RecipeSearch, type GroupedRecipe } from "@/app/_components/recipe-search";
import { useSessionResources } from "@/lib/resources/session";
import { MAX_RECIPES } from "@/lib/styles/sizes";

import {
  getRecipeStoresFromStorage,
  setRecipeStoresToStorage,
  type RecipeStore,
} from "@/lib/recipe/recipe";
import { verify } from "@/lib/util";

import {
  deleteUserRecipe,
  deleteUserRecipeVersion,
  setUserRecipeFavourite,
  updateUserRecipeVersion,
  type RecipeVersionMeta,
  type SavedRecipeVersionJson,
} from "@/lib/data/recipes";

/** Recipes page: browse and load recipes from embedded data and the user's saved versions */
export default function RecipesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { savedRecipes, refreshUserRecipes } = useSessionResources();

  const userEmail = session?.user?.email;

  /**
   * Write the chosen version into the given localStorage slot and navigate to the calculator.
   * For embedded entries (`recipeId === undefined`) the slot is populated anonymously; for saved
   * entries the slot carries a `savedRef` so the editor knows it is editing a specific saved
   * version.
   */
  function handleLoadRecipe(
    entry: GroupedRecipe,
    version: SavedRecipeVersionJson,
    slotIndex: number,
  ) {
    const stores = getRecipeStoresFromStorage();

    const serializedRows = version.recipe.map(([n, q]) => `${n}\t${q}`).join("\n");
    const store: RecipeStore = {
      name: entry.name,
      serializedRows,
      ...(entry.recipeId !== undefined && {
        savedRef: { recipeId: entry.recipeId, versionNumber: version.version },
      }),
      ...(version.evaporation ? { evaporation: version.evaporation } : {}),
    };
    stores[slotIndex] = store;

    setRecipeStoresToStorage(stores);
    router.push(`/calculator?slot=${String(slotIndex)}`);
  }

  /** Delete the entry (all versions) from the user's saved recipes and refresh the list */
  async function handleDeleteSavedRecipe(entry: GroupedRecipe) {
    verify(
      userEmail && entry.recipeId !== undefined,
      "handleDeleteSavedRecipe invoked while userEmail or entry.recipeId is missing",
    );

    await deleteUserRecipe(userEmail, entry.recipeId);
    await refreshUserRecipes();
  }

  /** Delete a single version of a saved recipe and refresh the list */
  async function handleDeleteSavedRecipeVersion(
    entry: GroupedRecipe,
    version: SavedRecipeVersionJson,
  ) {
    verify(
      userEmail && entry.recipeId !== undefined,
      "handleDeleteSavedRecipeVersion invoked while userEmail or entry.recipeId is missing",
    );

    await deleteUserRecipeVersion(userEmail, entry.recipeId, version.version);
    await refreshUserRecipes();
  }

  /** Update part of a saved recipe version's editable details, then refresh the list */
  async function handleUpdateSavedRecipeVersion(
    entry: GroupedRecipe,
    version: SavedRecipeVersionJson,
    meta: RecipeVersionMeta,
  ) {
    verify(
      userEmail && entry.recipeId !== undefined,
      "handleUpdateSavedRecipeVersion invoked while userEmail or entry.recipeId is missing",
    );

    await updateUserRecipeVersion(userEmail, entry.recipeId, version.version, meta);
    await refreshUserRecipes();
  }

  /** Star or clear the star on a saved recipe, then refresh the list */
  async function handleToggleSavedRecipeFavourite(entry: GroupedRecipe, favourite: boolean) {
    verify(
      userEmail && entry.recipeId !== undefined,
      "handleToggleSavedRecipeFavourite invoked while userEmail or entry.recipeId is missing",
    );

    await setUserRecipeFavourite(userEmail, entry.recipeId, favourite);
    await refreshUserRecipes();
  }

  const slots = Array.from({ length: MAX_RECIPES }, (_, idx) => idx);

  return (
    <div className="mx-auto mt-4 max-w-5xl px-1 md:px-4">
      <RecipeSearch
        onLoadRecipe={handleLoadRecipe}
        savedRecipes={savedRecipes}
        slots={slots}
        onDeleteSavedRecipe={userEmail ? handleDeleteSavedRecipe : undefined}
        onDeleteSavedRecipeVersion={userEmail ? handleDeleteSavedRecipeVersion : undefined}
        onUpdateSavedRecipeVersion={userEmail ? handleUpdateSavedRecipeVersion : undefined}
        onToggleSavedRecipeFavourite={userEmail ? handleToggleSavedRecipeFavourite : undefined}
      />
    </div>
  );
}
