"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { RecipeSearch, type GroupedRecipe } from "@/app/_components/recipe-search";
import { ActionError } from "@/app/_elements/action-error";
import { RECIPE_ERROR_MESSAGES, RecipeError } from "@/lib/recipe/recipe";
import type { DataError, Result } from "@/lib/result";
import { useSignedIn } from "@/lib/hooks/use-signed-in";
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
  const { savedRecipes, refreshUserRecipes } = useSessionResources();

  const signedIn = useSignedIn();

  /** Why the last action was refused; cleared as the next one starts. */
  const [actionError, setActionError] = useState<DataError | RecipeError | undefined>(undefined);

  /** Run a mutating action, surfacing its refusal or refreshing the list on success. */
  async function runAction(action: () => Promise<Result<unknown, RecipeError>>) {
    setActionError(undefined);
    const result = await action();
    if (!result.ok) setActionError(result.error);
    await refreshUserRecipes();
  }

  /**
   * Write the chosen version into the given localStorage slot and navigate to the calculator. For
   * embedded entries (`recipeId === undefined`) the slot is populated anonymously; for saved ones
   * the slot carries a `savedRef` so the editor knows it is editing a specific saved version.
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
      signedIn && entry.recipeId !== undefined,
      "handleDeleteSavedRecipe invoked while signed out or entry.recipeId is missing",
    );
    const { recipeId } = entry;
    await runAction(() => deleteUserRecipe(recipeId));
  }

  /** Delete a single version of a saved recipe and refresh the list */
  async function handleDeleteSavedRecipeVersion(
    entry: GroupedRecipe,
    version: SavedRecipeVersionJson,
  ) {
    verify(
      signedIn && entry.recipeId !== undefined,
      "handleDeleteSavedRecipeVersion invoked while signed out or entry.recipeId is missing",
    );
    const { recipeId } = entry;
    await runAction(() => deleteUserRecipeVersion(recipeId, version.version));
  }

  /** Update part of a saved recipe version's editable details, then refresh the list */
  async function handleUpdateSavedRecipeVersion(
    entry: GroupedRecipe,
    version: SavedRecipeVersionJson,
    meta: RecipeVersionMeta,
  ) {
    verify(
      signedIn && entry.recipeId !== undefined,
      "handleUpdateSavedRecipeVersion invoked while signed out or entry.recipeId is missing",
    );
    const { recipeId } = entry;
    await runAction(() => updateUserRecipeVersion(recipeId, version.version, meta));
  }

  /** Star or clear the star on a saved recipe, then refresh the list */
  async function handleToggleSavedRecipeFavourite(entry: GroupedRecipe, favourite: boolean) {
    verify(
      signedIn && entry.recipeId !== undefined,
      "handleToggleSavedRecipeFavourite invoked while signed out or entry.recipeId is missing",
    );
    const { recipeId } = entry;
    await runAction(() => setUserRecipeFavourite(recipeId, favourite));
  }

  const slots = Array.from({ length: MAX_RECIPES }, (_, idx) => idx);

  return (
    <div className="page-gutters mx-auto mt-4 max-w-5xl">
      <ActionError error={actionError} messages={RECIPE_ERROR_MESSAGES} />
      <RecipeSearch
        onLoadRecipe={handleLoadRecipe}
        savedRecipes={savedRecipes}
        slots={slots}
        onDeleteSavedRecipe={signedIn ? handleDeleteSavedRecipe : undefined}
        onDeleteSavedRecipeVersion={signedIn ? handleDeleteSavedRecipeVersion : undefined}
        onUpdateSavedRecipeVersion={signedIn ? handleUpdateSavedRecipeVersion : undefined}
        onToggleSavedRecipeFavourite={signedIn ? handleToggleSavedRecipeFavourite : undefined}
      />
    </div>
  );
}
