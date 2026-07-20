"use client";

import { ChangeEvent, Fragment, ReactNode, useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  ClipboardCopy,
  ClipboardPaste,
  Droplets,
  GitBranchPlus,
  Lock,
  LockOpen,
  Save,
  Trash,
} from "lucide-react";

import type { LightRecipe } from "@workspace/sci-cream";

import {
  IngredientRow,
  Recipe,
  RecipeContextState,
  RecipeUpdates,
  SavedRecipeRef,
  clearRecipeIdentity,
  getRecipeIndices,
  isRecipeDirty,
  isLockable,
  isRecipeEmpty,
  isRecipeRenamed,
  makeBalancedRecipeUpdates,
  makeLightRecipe,
  makeUpdatedRecipe,
  makeUpdatedRecipeContext,
  makeUpdatedRow,
  makeUpdatedRecipeFromStore,
  stringifyRecipe,
  stringifyRecipeToStore,
  setRecipeStoresToStorage,
  getRecipeStoresFromStorage,
  withRecipeIdentity,
} from "@/lib/recipe";

import {
  createUserRecipe,
  createUserRecipeVersion,
  renameUserRecipe,
  updateUserRecipeVersion,
} from "@/lib/data";

import { makeShareRows } from "@/lib/recipe-share";
import { useSessionResources } from "@/lib/session-resources";
import { RecipeSelect, useRecipeIdxState } from "@/app/_elements/selects/recipe-select";
import { ShareRecipeAction } from "@/app/_elements/recipe-share-dialog";
import { VersionBadge } from "@/app/_elements/version-badge";
import { formatCompositionValue } from "@/lib/comp-value-format";
import { COMPONENT_ACTION_ICON_SIZE, RECIPE_TOTAL_ROWS } from "@/lib/styles/sizes";
import { standardInputStepByPercent, verify } from "@/lib/util";

/** Parse a user-entered evaporation grams value from an input event (empty → undefined). */
function parseEvaporationInput(e: ChangeEvent<HTMLInputElement>): number | undefined {
  const v = e.target.value;
  return v === "" ? undefined : parseFloat(v);
}

/**
 * Bare read-only table of a recipe's ingredients, quantities (in grams), and per-row percentage
 * of the mix total. Empty ingredient rows are filtered out so the table is sized to its content,
 * suitable for embedding in recipe-search results or save dialogs.
 *
 * Caller is responsible for sizing/scrolling.
 */
export function RecipeTable({
  recipe,
  isValidIngredient,
}: {
  recipe: Recipe;
  isValidIngredient?: (name: string) => boolean;
}) {
  const mixTotal = recipe.mixTotal;
  const rows = recipe.ingredientRows.filter((row) => row.name !== "" || row.quantity !== undefined);

  return (
    <table className="w-full border-separate border-spacing-0">
      <thead>
        <tr className="h-6.5 text-center">
          <th className="table-col-header">Ingredient</th>
          <th className="table-col-header w-15">Qty (g)</th>
          <th className="table-col-header w-13.75 pr-1 pl-2 whitespace-nowrap">Qty (%)</th>
        </tr>
        <tr className="h-6.25">
          <td className="table-total px-1 text-center">
            Total
            {/* Yield (final mix mass) shown inline when water is evaporated; mirrors the editor */}
            {mixTotal && recipe.evaporation ? (
              <span
                className="text-secondary ml-1 text-xs font-normal whitespace-nowrap"
                title="Yield: final mix mass after evaporation"
              >
                → {(mixTotal - recipe.evaporation).toFixed(0)} g
              </span>
            ) : null}
          </td>
          <td className="table-total comp-val px-3.75">{mixTotal ? mixTotal.toFixed(0) : ""}</td>
          <td className="table-total comp-val px-1">{mixTotal ? "100   " : ""}</td>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const invalid =
            isValidIngredient !== undefined && row.name !== "" && !isValidIngredient(row.name);
          return (
            <tr key={row.index} className="h-6.25">
              <td
                title={row.name}
                className={`table-inner-cell max-w-0 truncate px-2 ${invalid ? "-outline-offset-2 outline-red-400 outline-solid" : ""}`}
              >
                {row.name}
              </td>
              <td className="table-inner-cell comp-val px-2 text-right font-mono">
                {row.quantity ?? ""}
              </td>
              <td className="table-inner-cell comp-val px-1">
                {row.quantity && mixTotal
                  ? formatCompositionValue((row.quantity / mixTotal) * 100)
                  : ""}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * Bare editable recipe table: a 3-column grid (Ingredient | Qty (g) | Qty (%)) with `<input>`
 * fields for the ingredient name and quantity, and a computed percentage cell. Renders every
 * `ingredientRow` in the recipe — including empty rows — so it preserves a fixed shape suitable
 * for direct entry.
 *
 * The caller owns the recipe state and supplies change handlers. The component renders a
 * `<datalist id="valid-ingredients">` for ingredient-name autocomplete.
 */
export function RecipeEditorTable({
  recipe,
  validIngredients,
  hasIngredient,
  onNameChange,
  onQuantityChange,
  onLockToggle,
  onLockAllToggle,
}: {
  recipe: Recipe;
  validIngredients: string[];
  hasIngredient: (name: string) => boolean;
  onNameChange: (rowIdx: number, name: string) => void;
  onQuantityChange: (rowIdx: number, qtyStr: string) => void;
  /** Toggle a row's balancing lock (whether the balancer holds it fixed at its current amount) */
  onLockToggle: (rowIdx: number) => void;
  /** Lock or unlock every lockable row at once (the balancing "select all" for the totals row) */
  onLockAllToggle: () => void;
}) {
  const mixTotal = recipe.mixTotal;

  const lockableRows = recipe.ingredientRows.filter((row) => isLockable(row, hasIngredient));
  const allLocked = lockableRows.length > 0 && lockableRows.every((row) => row.locked);

  return (
    <>
      <datalist id="valid-ingredients">
        {validIngredients.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <table className="w-full border-separate border-spacing-0">
        <thead className="table-sticky-head">
          <tr className="h-6.5 text-center">
            <th className="table-col-header">Ingredient</th>
            <th className="table-col-header w-15">Qty (g)</th>
            <th className="table-col-header w-13.75 pr-1 pl-2 whitespace-nowrap">Qty (%)</th>
          </tr>
          <tr className="h-6.25">
            <td className="table-total px-1">
              <div className="flex items-center">
                <span className="flex-1 text-center">
                  Total
                  {/* Yield (final mix mass) shown inline once water is being evaporated */}
                  {mixTotal && recipe.evaporation ? (
                    <span
                      className="text-secondary ml-1 text-xs font-normal whitespace-nowrap"
                      title="Yield: final mix mass after evaporation"
                    >
                      → {(mixTotal - recipe.evaporation).toFixed(0)} g
                    </span>
                  ) : null}
                </span>
                {/* Lock-all: pins every lockable row, or unlocks them once all are locked. */}
                {recipe.index === 0 && lockableRows.length > 0 && (
                  <button
                    type="button"
                    className={`action-button mr-0.5 flex shrink-0 items-center px-0.5 py-0 ${
                      allLocked ? "" : "opacity-60"
                    }`}
                    onClick={onLockAllToggle}
                    aria-pressed={allLocked}
                    title={
                      allLocked
                        ? "All ingredients held while balancing (click to unlock all)"
                        : "Hold every ingredient at its current amount while balancing (click to lock all)"
                    }
                    data-testid="recipe-lock-all"
                  >
                    {allLocked ? (
                      <Lock size={COMPONENT_ACTION_ICON_SIZE - 4} />
                    ) : (
                      <LockOpen size={COMPONENT_ACTION_ICON_SIZE - 4} />
                    )}
                  </button>
                )}
              </div>
            </td>
            <td className="table-total comp-val px-3.75">{mixTotal ? mixTotal.toFixed(0) : ""}</td>
            <td className="table-total comp-val px-1">{mixTotal ? "100   " : ""}</td>
          </tr>
        </thead>
        <tbody>
          {/* @todo The ingredient/input rows are not respecting < h-6/[25px]; not sure why yet */}
          {/* @todo Temporarily filter out last row to avoid a scrollbar on default panel height */}
          {recipe.ingredientRows
            .filter((row) => row.index < RECIPE_TOTAL_ROWS - 1)
            .map((row) => (
              <tr key={row.index} className="group h-6.25">
                <td className="table-inner-cell max-w-0">
                  <div className="flex items-center">
                    <input
                      type="search"
                      value={row.name}
                      onChange={(e) => onNameChange(row.index, e.target.value)}
                      className={`table-fillable-input whitespace-nowrap ${
                        row.name === "" || hasIngredient(row.name)
                          ? "focus:ring-blue-400"
                          : "-outline-offset-2 outline-red-400 outline-solid focus:ring-red-400"
                      } min-w-0 flex-1 px-2`}
                      placeholder=""
                      list="valid-ingredients"
                    />
                    {/* Lock toggle, shown only for a resolved ingredient with an amount to hold.
                        Unlocked, it reveals on row hover/focus; locked, it always shows. */}
                    {recipe.index === 0 && isLockable(row, hasIngredient) && (
                      <button
                        type="button"
                        className={`action-button mr-0.5 flex shrink-0 items-center px-0.5 py-0 ${
                          row.locked
                            ? ""
                            : "opacity-0 group-hover:opacity-60 focus-visible:opacity-60"
                        }`}
                        onClick={() => onLockToggle(row.index)}
                        aria-pressed={!!row.locked}
                        title={
                          row.locked
                            ? "Locked — held at this amount while balancing (click to unlock)"
                            : "Unlocked — the balancer may change this amount (click to lock)"
                        }
                        data-testid={`recipe-row-${row.index}-lock`}
                      >
                        {row.locked ? (
                          <Lock size={COMPONENT_ACTION_ICON_SIZE - 4} />
                        ) : (
                          <LockOpen size={COMPONENT_ACTION_ICON_SIZE - 4} />
                        )}
                      </button>
                    )}
                  </div>
                </td>
                <td className="table-inner-cell">
                  <input
                    type="number"
                    value={row.quantity?.toString() || ""}
                    onChange={(e) => onQuantityChange(row.index, e.target.value)}
                    placeholder=""
                    step={standardInputStepByPercent(row.quantity, 2.5, 10)}
                    min={0}
                    className={`table-fillable-input w-full text-right font-mono ${
                      row.quantity !== undefined && !(row.name !== "" && hasIngredient(row.name))
                        ? "-outline-offset-2 outline-red-400 outline-solid focus:ring-red-400"
                        : ""
                    }`}
                  />
                </td>
                <td className="table-inner-cell comp-val px-1">
                  {row.name !== "" && hasIngredient(row.name) && row.quantity && mixTotal
                    ? formatCompositionValue((row.quantity / mixTotal) * 100)
                    : ""}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </>
  );
}

/** Save status for the recipe editor */
enum SaveStatus {
  Idle = "idle",
  Saving = "saving",
  Saved = "saved",
  Error = "error",
}

/**
 * Recipe editor view: toolbar (RecipeSelect, recipe name display, copy/paste/clear buttons) plus
 * the {@link RecipeEditorTable}. Owns all editor state — recipe-context updates, ingredient
 * resolution, localStorage persistence, and clipboard interactions — and writes through to the
 * shared `RecipeContext` via the provided state setter.
 *
 * `urlSlot` is the recipe slot from the `?slot=` URL param; present = override display, absent =
 * restore stored. `toolbarPrefix` is rendered inside the toolbar's left-aligned group (alongside
 * `RecipeSelect`); used by the panel wrapper to inject a drag handle.
 */
export function RecipeEditor({
  recipeCtxState: [recipeContext, setRecipeContext],
  urlSlot,
  persistKey,
  toolbarPrefix,
  onUserQuantityEdit,
}: {
  recipeCtxState: RecipeContextState;
  urlSlot?: number;
  persistKey?: string;
  toolbarPrefix?: ReactNode;
  /** Fired on any user-driven row quantity edit; used to cancel continuous-balance mode. */
  onUserQuantityEdit?: () => void;
}) {
  const {
    wasmResourcesState: [wasmResources],
    refreshUserRecipes,
  } = useSessionResources();

  const { recipes: allRecipes } = recipeContext;

  const [currentRecipeIdx, setCurrentRecipeIdx] = useRecipeIdxState(persistKey, 0, { urlSlot });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(SaveStatus.Idle);
  const [deevaporateError, setDeevaporateError] = useState<string | undefined>(undefined);

  const { data: session } = useSession();
  const userEmail = session?.user?.email ?? null;

  const recipesRef = useRef(allRecipes);
  recipesRef.current = allRecipes;

  /**
   * Update multiple recipes at once, with a single state update.
   *
   * This is necessary when updating multiple recipes at once, e.g. in the useEffect to prevent
   * stale ingredient context, otherwise dependent components may asynchronously try to render stale
   * `Composition` or `MixProperties` objects, which can lead to crashes due to freed WASM memory.
   */
  const updateRecipes = (updatedRecipes: Recipe[]) => {
    setRecipeContext((prev) => makeUpdatedRecipeContext(prev, updatedRecipes));
  };

  /** Update a single recipe in context by applying the given recipe updates */
  const updateRecipe = (recipeIdx: number, recipeUpdates: RecipeUpdates) => {
    updateRecipes([makeUpdatedRecipe(allRecipes[recipeIdx], recipeUpdates, wasmResources)]);
  };

  /** Get the ingredient row at the given recipe and row indices */
  const getRow = (recipeIdx: number, rowIdx: number): IngredientRow => {
    return allRecipes[recipeIdx].ingredientRows[rowIdx];
  };

  /** Signal a user-driven row quantity edit (e.g. to cancel continuous-balance mode) */
  const userQuantityEdit = () => onUserQuantityEdit?.();

  /** Update the name of the currently selected recipe */
  const updateCurrentRecipeName = (name: string) => {
    updateRecipe(currentRecipeIdx, { name });
  };

  /** Handle a name change for a row in the currently selected recipe */
  const updateCurrentIngredientRowName = (index: number, name: string) => {
    updateRecipe(currentRecipeIdx, {
      rows: [makeUpdatedRow(getRow(currentRecipeIdx, index), name, undefined, wasmResources)],
    });
  };

  /** Handle a quantity change for a row in the currently selected recipe */
  const updateCurrentIngredientRowQuantity = (index: number, qtyStr: string) => {
    userQuantityEdit();

    updateRecipe(currentRecipeIdx, {
      rows: [makeUpdatedRow(getRow(currentRecipeIdx, index), undefined, qtyStr, wasmResources)],
    });
  };

  /** Set the currently selected recipe's evaporation (grams of water removed) */
  const updateCurrentRecipeEvaporation = (grams: number | undefined) => {
    // An empty field parses to `undefined`; map it to 0 so it clears rather than reading as no-op.
    // sci-cream validates the amount; an excess surfaces as `mixError`, flagged on the input.
    updateRecipe(currentRecipeIdx, { evaporation: grams ?? 0 });
  };

  /** De-evaporate: re-balance the ingredients to the post-evaporation mix properties. */
  const deevaporateCurrentRecipe = () => {
    const recipe = allRecipes[currentRecipeIdx];
    verify(
      !!recipe.evaporation && !isRecipeEmpty(recipe),
      "deevaporateCurrentRecipe invoked while the button should be disabled ",
    );

    try {
      const light = makeLightRecipe(recipe, wasmResources.hasIngredient);
      const deevaporated = wasmResources.wasmBridge.deevaporate_recipe(
        light,
        recipe.evaporation,
      ) as LightRecipe;

      const updates = makeBalancedRecipeUpdates(recipe, deevaporated, wasmResources.hasIngredient);
      setDeevaporateError(undefined);
      updateRecipe(currentRecipeIdx, { ...updates, evaporation: 0 });
    } catch (err) {
      console.error("de-evaporate failed:", err);
      setDeevaporateError(String(err));
    }
  };

  /**
   * Toggle a row's balancing lock. Not a content edit — it doesn't cancel continuous-balance mode,
   * so flipping a lock while Auto is on re-balances immediately with the new constraint.
   */
  const toggleCurrentIngredientRowLock = (index: number) => {
    const row = getRow(currentRecipeIdx, index);
    updateRecipe(currentRecipeIdx, { rows: [{ ...row, locked: !row.locked }] });
  };

  /**
   * Lock or unlock every lockable row at once (a resolved ingredient with an amount). Locks all
   * unless they are already all locked, in which case it unlocks. Does not disable auto-balance.
   */
  const toggleAllIngredientRowLocks = () => {
    const lockable = allRecipes[currentRecipeIdx].ingredientRows.filter((row) =>
      isLockable(row, wasmResources.hasIngredient),
    );
    const lockNext = !lockable.every((row) => row.locked);
    updateRecipe(currentRecipeIdx, { rows: lockable.map((row) => ({ ...row, locked: lockNext })) });
  };

  /**
   * Parse and apply a tab-separated recipe string (ingredient rows only) to the given recipe slot.
   *
   * Only the rows change: the slot keeps its name, saved identity, evaporation, and baseline, so
   * a paste registers as an edit of the loaded recipe (dirty when it differs from the saved one).
   */
  const pasteRecipe = async (recipeIdx: number, serializedRows: string) => {
    userQuantityEdit();

    const current = allRecipes[recipeIdx];
    const pasted = makeUpdatedRecipeFromStore(
      current,
      {
        name: current.name,
        serializedRows,
        savedRef: current.savedRef,
        evaporation: current.evaporation,
      },
      wasmResources,
    );
    // `makeUpdatedRecipeFromStore` recaptures the baseline from the pasted rows; restore the slot's
    // original baseline so dirty-detection compares against the saved version, not the paste.
    pasted.baseline = current.baseline;
    updateRecipes([pasted]);
  };

  /**
   * Clear all ingredient rows in the given recipe slot. Also clears evaporation and drops any
   * saved-recipe identity so the slot returns to a clean "anonymous" state without a dirty flag.
   */
  const clearRecipe = (recipeIdx: number) => {
    const cleared = makeUpdatedRecipe(
      allRecipes[recipeIdx],
      {
        name: "",
        rows: allRecipes[recipeIdx].ingredientRows.map((row) =>
          makeUpdatedRow(getRow(recipeIdx, row.index), "", "", wasmResources),
        ),
        evaporation: 0,
      },
      wasmResources,
    );
    updateRecipes([clearRecipeIdentity(cleared)]);
  };

  /** Clear all ingredient rows in the currently selected recipe slot */
  const clearCurrentRecipe = () => {
    clearRecipe(currentRecipeIdx);
  };

  /** Copy the currently selected recipe as a tab-separated string to the clipboard */
  const copyCurrentRecipeToClipboard = async () => {
    await navigator.clipboard.writeText(stringifyRecipe(currentRecipe));
  };

  /** Read a tab-separated recipe string from clipboard and apply it to the current recipe slot */
  const pasteCurrentRecipeFromClipboard = async () => {
    await pasteRecipe(currentRecipeIdx, await navigator.clipboard.readText());
  };

  /**
   * Persist a rename for the loaded recipe when the in-editor name differs from baseline. Returns
   * `true` on success (or when no rename is needed), `false` if the rename failed.
   */
  const applyRenameIfNeeded = async (recipe: Recipe): Promise<boolean> => {
    if (!userEmail || recipe.savedRef === undefined || !isRecipeRenamed(recipe)) return true;
    const renamed = await renameUserRecipe(userEmail, recipe.savedRef.recipeId, recipe.name.trim());
    return renamed !== undefined;
  };

  /**
   * Shared scaffolding for the save flows: sets `Saving` → runs `operation` → on success applies
   * the returned identity to the recipe and sets `Saved`; on a falsy return or thrown error sets
   * `Error`. Callers do their own precondition checks before invoking this.
   */
  const performSave = async (
    recipe: Recipe,
    operation: () => Promise<SavedRecipeRef | undefined>,
  ) => {
    setSaveStatus(SaveStatus.Saving);
    try {
      const newRef = await operation();
      if (!newRef) {
        setSaveStatus(SaveStatus.Error);
        return;
      }
      updateRecipes([withRecipeIdentity(recipe, newRef)]);
      setSaveStatus(SaveStatus.Saved);

      // Refresh the shared saved-recipes cache so other routes (e.g. the recipes list) see it.
      await refreshUserRecipes();
    } catch (err) {
      console.error("save failed:", err);
      setSaveStatus(SaveStatus.Error);
    }
  };

  /**
   * Save the currently selected recipe.
   *
   * Two branches based on the recipe's current identity:
   * - No `savedRef`: creates a brand-new recipe with version 1.
   * - Has `savedRef`: rewrites that version in-place (rename-on-save is honored when it differs)
   */
  const saveCurrentRecipe = async () => {
    const recipe = allRecipes[currentRecipeIdx];

    verify(
      userEmail && currentRecipeIdx === 0 && recipe.name.trim() !== "" && !isRecipeEmpty(recipe),
      "saveCurrentRecipe invoked while the Save button should be disabled",
    );

    await performSave(recipe, async () => {
      const lightRecipe = makeLightRecipe(recipe, wasmResources.hasIngredient);

      if (recipe.savedRef === undefined) {
        const created = await createUserRecipe(userEmail, recipe.name.trim(), lightRecipe);
        return created && { recipeId: created.recipeId, versionNumber: created.version.version };
      }

      // Existing recipe: rename first if needed, then overwrite the loaded version
      if (!(await applyRenameIfNeeded(recipe))) return undefined;
      const { recipeId, versionNumber } = recipe.savedRef;
      const updated = await updateUserRecipeVersion(userEmail, recipeId, versionNumber, {
        recipe: lightRecipe,
      });
      return updated && { recipeId, versionNumber };
    });
  };

  /**
   * Save the currently selected recipe as a new version of the loaded recipe. Only meaningful when
   * a saved recipe is currently loaded (`savedRef` defined); the button is disabled otherwise.
   */
  const saveCurrentRecipeAsNewVersion = async () => {
    const recipe = allRecipes[currentRecipeIdx];

    verify(
      userEmail &&
        currentRecipeIdx === 0 &&
        recipe.savedRef !== undefined &&
        recipe.name.trim() !== "" &&
        !isRecipeEmpty(recipe),
      "saveCurrentRecipeAsNewVersion invoked while the button should be disabled",
    );

    // Capture the narrowed savedRef for use inside the operation closure
    const { recipeId } = recipe.savedRef;

    await performSave(recipe, async () => {
      if (!(await applyRenameIfNeeded(recipe))) return undefined;
      const lightRecipe = makeLightRecipe(recipe, wasmResources.hasIngredient);
      const created = await createUserRecipeVersion(userEmail, recipeId, lightRecipe);
      return created && { recipeId, versionNumber: created.version };
    });
  };

  // Prevents stale ingredient context if a row is changed (e.g. a recipe is pasted) before we have
  // had a chance to fetch all user-defined ingredients and seed them into the wasmBridge database.
  useEffect(() => {
    updateRecipes(
      allRecipes.map((recipe) =>
        makeUpdatedRecipe(
          recipe,
          {
            // Need to call `makeUpdatedRow` to ensure that the WASM `Ingredient`s are updated
            rows: recipe.ingredientRows.map((row) =>
              makeUpdatedRow(row, row.name, row.quantity?.toString(), wasmResources),
            ),
          },
          wasmResources,
        ),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wasmResources.updateIdx]);

  // On initial load, populate recipes from local storage
  useEffect(() => {
    updateRecipes(
      getRecipeStoresFromStorage().map((recipeStore, idx) =>
        makeUpdatedRecipeFromStore(allRecipes[idx], recipeStore, wasmResources),
      ),
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Periodically store recipes to local storage
  useEffect(() => {
    const intervalID = setInterval(() => {
      setRecipeStoresToStorage(recipesRef.current.map((recipe) => stringifyRecipeToStore(recipe)));
    }, 2000);
    return () => clearInterval(intervalID);
  }, []);

  // Revert the save-status indicator back to idle after a short delay
  useEffect(() => {
    if (saveStatus === SaveStatus.Idle || saveStatus === SaveStatus.Saving) return;
    const id = setTimeout(() => setSaveStatus(SaveStatus.Idle), 2000);
    return () => clearTimeout(id);
  }, [saveStatus]);

  // Drop a stale de-evaporate error when switching recipe slots.
  useEffect(() => {
    setDeevaporateError(undefined);
  }, [currentRecipeIdx]);

  const currentRecipe = allRecipes[currentRecipeIdx];
  const validIngredients = wasmResources.wasmBridge.get_all_ingredient_names();

  const iconSize = COMPONENT_ACTION_ICON_SIZE;

  const canSave =
    userEmail !== null &&
    currentRecipeIdx === 0 &&
    currentRecipe.name.trim() !== "" &&
    !isRecipeEmpty(currentRecipe);

  // "Save as new version" only makes sense once the recipe has been saved at least once
  const canSaveAsNewVersion = canSave && currentRecipe.savedRef !== undefined;

  const canDeevaporate = !!currentRecipe.evaporation && !isRecipeEmpty(currentRecipe);
  const evaporationError = currentRecipe.mixError !== undefined && !!currentRecipe.evaporation;

  const evaporationTitle = evaporationError
    ? currentRecipe.mixError
    : "Grams of water evaporated during preparation";

  const deevaporateTitle = deevaporateError
    ? `De-evaporate failed: ${deevaporateError}`
    : !currentRecipe.evaporation
      ? "No evaporation to remove"
      : isRecipeEmpty(currentRecipe)
        ? "Add ingredients to de-evaporate"
        : "Reformulate as an equivalent recipe that needs no evaporation step";

  const dirty = isRecipeDirty(currentRecipe);

  const saveTitle = !userEmail
    ? "Sign in to save recipes"
    : currentRecipeIdx !== 0
      ? "Select main recipe to save"
      : !currentRecipe.name.trim()
        ? "Enter a name to save"
        : isRecipeEmpty(currentRecipe)
          ? "Add ingredients to save"
          : saveStatus === SaveStatus.Saving
            ? "Saving…"
            : saveStatus === SaveStatus.Saved
              ? "Saved"
              : saveStatus === SaveStatus.Error
                ? "Save failed — try again"
                : currentRecipe.savedRef !== undefined
                  ? dirty
                    ? `Save changes to version ${currentRecipe.savedRef.versionNumber}`
                    : `Saved — version ${currentRecipe.savedRef.versionNumber}`
                  : "Save recipe";

  const saveAsNewVersionTitle = !userEmail
    ? "Sign in to save recipes"
    : currentRecipeIdx !== 0
      ? "Select main recipe to save"
      : !canSaveAsNewVersion
        ? "Save the recipe at least once before creating a new version"
        : saveStatus === SaveStatus.Saving
          ? "Saving…"
          : "Save as new version";

  const saveIconColorClass =
    saveStatus === SaveStatus.Saved
      ? "text-green-500"
      : saveStatus === SaveStatus.Error
        ? "text-red-500"
        : dirty
          ? "text-amber-500"
          : undefined;

  return (
    <div className="flex h-full flex-col">
      <div className="toolbar">
        {toolbarPrefix}
        <RecipeSelect
          allRecipes={allRecipes}
          enabledRecipeIndices={getRecipeIndices(allRecipes)}
          currentRecipeIdxState={[currentRecipeIdx, setCurrentRecipeIdx]}
        />
        <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
          {/* Evaporation input: grams of water removed */}
          <div className="flex items-center gap-1" title={evaporationTitle}>
            <span className="text-secondary text-xs font-medium tracking-wide whitespace-nowrap uppercase">
              Evap (g)
            </span>
            <input
              type="number"
              min={0}
              step={standardInputStepByPercent(currentRecipe.evaporation)}
              className={`boxed-input comp-val w-14 px-0.5 py-0 text-sm ${
                evaporationError ? "outline-2 -outline-offset-2 outline-red-400 outline-solid" : ""
              }`}
              value={currentRecipe.evaporation || ""}
              placeholder="—"
              onChange={(e) => updateCurrentRecipeEvaporation(parseEvaporationInput(e))}
              aria-label="Evaporation (g)"
              aria-invalid={evaporationError}
              data-testid="recipe-evaporation-grams"
            />
          </div>
          {/* Action buttons: de-evaporate, copy, share, paste, clear, save, save as new version */}
          <div className="flex shrink-0">
            {[
              {
                label: (
                  <Droplets
                    size={iconSize}
                    className={deevaporateError ? "text-red-500" : undefined}
                  />
                ),
                action: deevaporateCurrentRecipe,
                title: deevaporateTitle,
                disabled: !canDeevaporate,
              },
              {
                node: (
                  <ShareRecipeAction
                    name={currentRecipe.name}
                    rows={makeShareRows(currentRecipe)}
                    evaporation={currentRecipe.evaporation}
                    buttonClassName="action-button px-1 py-0.75"
                    iconSize={iconSize}
                  />
                ),
              },
              {
                label: <ClipboardCopy size={iconSize} />,
                action: copyCurrentRecipeToClipboard,
                title: "Copy recipe to clipboard",
                disabled: false,
              },
              {
                label: <ClipboardPaste size={iconSize} />,
                action: pasteCurrentRecipeFromClipboard,
                title: "Paste recipe from clipboard",
                disabled: false,
              },
              {
                label: <Trash size={iconSize} />,
                action: clearCurrentRecipe,
                title: "Clear recipe",
                disabled: false,
              },
              {
                label: <Save size={iconSize} className={saveIconColorClass} />,
                action: saveCurrentRecipe,
                title: saveTitle,
                disabled: !canSave || saveStatus === SaveStatus.Saving,
              },
              {
                label: <GitBranchPlus size={iconSize} className={saveIconColorClass} />,
                action: saveCurrentRecipeAsNewVersion,
                title: saveAsNewVersionTitle,
                disabled: !canSaveAsNewVersion || saveStatus === SaveStatus.Saving,
              },
            ].map((entry, idx) =>
              "node" in entry ? (
                <Fragment key={idx}>{entry.node}</Fragment>
              ) : (
                <button
                  key={idx}
                  onClick={entry.action}
                  title={entry.title}
                  disabled={entry.disabled}
                  className="action-button px-1 py-0.75"
                >
                  {entry.label}
                </button>
              ),
            )}
          </div>
        </div>
      </div>
      {/* Recipe name row, beneath the toolbar: unsaved-changes dot, name field, version badge */}
      <div className="flex shrink-0 items-center gap-1 px-2 py-0.5">
        <span
          className={`leading-none text-amber-500 ${dirty ? "" : "invisible"}`}
          {...(dirty
            ? { "aria-label": "Unsaved changes", title: "Unsaved changes" }
            : { "aria-hidden": true })}
        >
          •
        </span>
        <input
          type="text"
          value={currentRecipe.name}
          onChange={(e) => updateCurrentRecipeName(e.target.value)}
          placeholder="Recipe name"
          aria-label="Recipe name"
          className="text-secondary table-fillable-input min-w-0 flex-1 truncate px-1 py-0 text-sm font-medium"
        />
        {currentRecipe.savedRef !== undefined && (
          <VersionBadge
            version={currentRecipe.savedRef.versionNumber}
            title={`Editing version ${currentRecipe.savedRef.versionNumber}`}
          />
        )}
      </div>
      <div data-testid="recipe-editor-table-pane" className="min-h-0 flex-1 overflow-auto">
        <RecipeEditorTable
          recipe={currentRecipe}
          validIngredients={validIngredients}
          hasIngredient={wasmResources.hasIngredient}
          onNameChange={updateCurrentIngredientRowName}
          onQuantityChange={updateCurrentIngredientRowQuantity}
          onLockToggle={toggleCurrentIngredientRowLock}
          onLockAllToggle={toggleAllIngredientRowLocks}
        />
      </div>
    </div>
  );
}
