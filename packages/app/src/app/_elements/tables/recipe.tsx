"use client";

import { ReactNode, useState, useEffect, useRef } from "react";
import { ClipboardCopy, ClipboardPaste, Trash } from "lucide-react";

import {
  IngredientRow,
  Recipe,
  RecipeContextState,
  RecipeUpdates,
  getRecipeIndices,
  makeUpdatedRecipe,
  makeUpdatedRow,
  makeUpdatedRecipeFromStore,
  stringifyRecipe,
  stringifyRecipeToStore,
  setRecipeStoresToStorage,
  getRecipeStoresFromStorage,
} from "@/lib/recipe";

import { WasmResourcesState } from "@/lib/wasm-resources";
import { RecipeSelect } from "@/app/_elements/selects/recipe-select";
import { formatCompositionValue } from "@/lib/comp-value-format";
import { COMPONENT_ACTION_ICON_SIZE } from "@/lib/styles/sizes";
import { standardInputStepByPercent } from "@/lib/util";

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
    <table className="w-full">
      <thead>
        <tr className="h-6.25 text-center">
          <th className="table-header min-w-50">Ingredient</th>
          <th className="table-header w-15">Qty (g)</th>
          <th className="table-header w-13.75 pr-1 pl-2 whitespace-nowrap">Qty (%)</th>
        </tr>
        <tr className="h-6.25">
          <td className="table-header px-1 text-center">Total</td>
          <td className="table-header comp-val px-3.75">{mixTotal ? mixTotal.toFixed(0) : ""}</td>
          <td className="table-header comp-val px-1">{mixTotal ? "100   " : ""}</td>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const invalid =
            isValidIngredient !== undefined && row.name !== "" && !isValidIngredient(row.name);
          return (
            <tr key={row.index} className="h-6.25">
              <td
                className={`table-inner-cell px-2 ${invalid ? "-outline-offset-2 outline-red-400 outline-solid" : ""}`}
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
}: {
  recipe: Recipe;
  validIngredients: string[];
  hasIngredient: (name: string) => boolean;
  onNameChange: (rowIdx: number, name: string) => void;
  onQuantityChange: (rowIdx: number, qtyStr: string) => void;
}) {
  const mixTotal = recipe.mixTotal;

  return (
    <>
      <datalist id="valid-ingredients">
        {validIngredients.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <table className="w-full">
        <thead>
          <tr className="h-6.25 text-center">
            <th className="table-header min-w-50">Ingredient</th>
            <th className="table-header w-15">Qty (g)</th>
            <th className="table-header w-13.75 pr-1 pl-2 whitespace-nowrap">Qty (%)</th>
          </tr>
          <tr className="h-6.25">
            <td className="table-header px-1 text-center">Total</td>
            <td className="table-header comp-val px-3.75">{mixTotal ? mixTotal.toFixed(0) : ""}</td>
            <td className="table-header comp-val px-1">{mixTotal ? "100   " : ""}</td>
          </tr>
        </thead>
        <tbody>
          {/* @todo The ingredient/input rows are not respecting < h-6/[25px]; not sure why yet */}
          {recipe.ingredientRows.map((row) => (
            <tr key={row.index} className="h-6.25">
              <td className="table-inner-cell">
                <input
                  type="search"
                  value={row.name}
                  onChange={(e) => onNameChange(row.index, e.target.value)}
                  className={`table-fillable-input ${
                    row.name === "" || hasIngredient(row.name)
                      ? "focus:ring-blue-400"
                      : "-outline-offset-2 outline-red-400 outline-solid focus:ring-red-400"
                  } w-full px-2`}
                  placeholder=""
                  list="valid-ingredients"
                />
              </td>
              <td className="table-inner-cell">
                <input
                  type="number"
                  value={row.quantity?.toString() || ""}
                  onChange={(e) => onQuantityChange(row.index, e.target.value)}
                  placeholder=""
                  step={standardInputStepByPercent(row.quantity, 2.5, 10)}
                  min={0}
                  className="table-fillable-input w-full text-right font-mono"
                />
              </td>
              <td className="table-inner-cell comp-val px-1">
                {row.quantity && mixTotal
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

/**
 * Recipe editor view: toolbar (RecipeSelect, recipe name display, copy/paste/clear buttons) plus
 * the {@link RecipeEditorTable}. Owns all editor state — recipe-context updates, ingredient
 * resolution, localStorage persistence, and clipboard interactions — and writes through to the
 * shared `RecipeContext` via the provided state setter.
 *
 * `toolbarPrefix` is rendered inside the toolbar's left-aligned group (alongside `RecipeSelect`);
 * used by the panel wrapper to inject a drag handle.
 */
export function RecipeEditor({
  props: {
    recipeCtxState: [recipeContext, setRecipeContext],
    wasmResourcesState: [wasmResources],
    initialRecipeIdx = 0,
    toolbarPrefix,
  },
}: {
  props: {
    recipeCtxState: RecipeContextState;
    wasmResourcesState: WasmResourcesState;
    initialRecipeIdx?: number;
    toolbarPrefix?: ReactNode;
  };
}) {
  const { wasmBridge } = wasmResources;
  const { recipes: allRecipes } = recipeContext;
  const [currentRecipeIdx, setCurrentRecipeIdx] = useState<number>(initialRecipeIdx);

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
    const newRecipes = [...recipeContext.recipes];

    for (const updatedRecipe of updatedRecipes) {
      newRecipes[updatedRecipe.index] = updatedRecipe;
    }

    setRecipeContext({ ...recipeContext, recipes: newRecipes });
  };

  /** Update a single recipe in context by applying the given recipe updates */
  const updateRecipe = (recipeIdx: number, recipeUpdates: RecipeUpdates) => {
    updateRecipes([makeUpdatedRecipe(allRecipes[recipeIdx], recipeUpdates, wasmResources)]);
  };

  /** Get the ingredient row at the given recipe and row indices */
  const getRow = (recipeIdx: number, rowIdx: number): IngredientRow => {
    return allRecipes[recipeIdx].ingredientRows[rowIdx];
  };

  /** Handle a name change for a row in the currently selected recipe */
  const updateCurrentIngredientRowName = (index: number, name: string) => {
    updateRecipe(currentRecipeIdx, {
      rows: [makeUpdatedRow(getRow(currentRecipeIdx, index), name, undefined, wasmResources)],
    });
  };

  /** Handle a quantity change for a row in the currently selected recipe */
  const updateCurrentIngredientRowQuantity = (index: number, qtyStr: string) => {
    updateRecipe(currentRecipeIdx, {
      rows: [makeUpdatedRow(getRow(currentRecipeIdx, index), undefined, qtyStr, wasmResources)],
    });
  };

  /** Parse and apply a tab-separated recipe string to the given recipe slot */
  const pasteRecipe = async (recipeIdx: number, serializedRows: string) => {
    updateRecipes([
      makeUpdatedRecipeFromStore(
        allRecipes[recipeIdx],
        { name: "", serializedRows },
        wasmResources,
      ),
    ]);
  };

  /** Clear all ingredient rows in the given recipe slot */
  const clearRecipe = (recipeIdx: number) => {
    updateRecipe(recipeIdx, {
      name: "",
      rows: allRecipes[recipeIdx].ingredientRows.map((row) =>
        makeUpdatedRow(getRow(recipeIdx, row.index), "", "", wasmResources),
      ),
    });
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

  const currentRecipe = allRecipes[currentRecipeIdx];
  const validIngredients = wasmBridge.get_all_ingredient_names();

  const iconSize = COMPONENT_ACTION_ICON_SIZE;

  return (
    <>
      <div className="flex items-center gap-1">
        <div className="flex shrink-0 items-center">
          {toolbarPrefix}
          <RecipeSelect
            allRecipes={allRecipes}
            enabledRecipeIndices={getRecipeIndices(allRecipes)}
            currentRecipeIdxState={[currentRecipeIdx, setCurrentRecipeIdx]}
          />
        </div>
        <div className="text-secondary flex-1 truncate px-1 py-0 text-sm font-medium">
          {currentRecipe.name ?? ""}
        </div>
        <div className="flex shrink-0">
          {[
            {
              label: <ClipboardCopy size={iconSize} />,
              action: copyCurrentRecipeToClipboard,
              title: "Copy recipe to clipboard",
            },
            {
              label: <ClipboardPaste size={iconSize} />,
              action: pasteCurrentRecipeFromClipboard,
              title: "Paste recipe from clipboard",
            },
            { label: <Trash size={iconSize} />, action: clearCurrentRecipe, title: "Clear recipe" },
          ].map(({ label, action, title }, idx) => (
            <button key={idx} onClick={action} title={title} className="action-button px-1 py-0.75">
              {label}
            </button>
          ))}
        </div>
      </div>
      <RecipeEditorTable
        recipe={currentRecipe}
        validIngredients={validIngredients}
        hasIngredient={wasmResources.hasIngredient}
        onNameChange={updateCurrentIngredientRowName}
        onQuantityChange={updateCurrentIngredientRowQuantity}
      />
    </>
  );
}
