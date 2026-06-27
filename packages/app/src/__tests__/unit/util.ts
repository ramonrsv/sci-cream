import "@testing-library/jest-dom/vitest";

import { expect } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";

import { propKeyAsModifiedShortStr } from "@/app/_elements/charts/properties-chart";
import { makeEmptyRecipe, makeEmptyRecipeContext } from "@/lib/recipe";
import { KeyFilter } from "@/app/_elements/selects/key-filter-select";
import { QtyToggle, QTY_TOGGLE_SHORT_LABELS } from "@/app/_elements/selects/qty-toggle-select";
import {
  DeltaToggle,
  DELTA_TOGGLE_SHORT_LABELS,
} from "@/app/_elements/selects/delta-toggle-select";
import { selectOption } from "@/__tests__/unit/select";

import {
  CompKey,
  FpdKey,
  PropKey,
  compToPropKey,
  fpdToPropKey,
  comp_key_as_med_str,
  prop_key_as_med_str,
} from "@workspace/sci-cream";

import { RecipeID, getLightRecipe, recipeIdToIdx, recipeIdToOption } from "@/__tests__/assets";
import { WASM_BRIDGE } from "@/__tests__/util";

/** Builds a Recipe using the recipe asset for the requested RecipeID, at the corresponding idx */
export function makeMockRecipe(recipeId: RecipeID) {
  const recipe = makeEmptyRecipe(recipeIdToIdx(recipeId));
  const lightRecipe = getLightRecipe(recipeId);

  const mixProperties = WASM_BRIDGE.calculate_recipe_mix_properties(lightRecipe);
  recipe.mixTotal = mixProperties.total_amount;
  recipe.mixProperties = mixProperties;

  lightRecipe.forEach(([name, qty], rowIdx) => {
    recipe.ingredientRows[rowIdx] = {
      index: rowIdx,
      name: name as string,
      quantity: qty as number,
      ingredient: WASM_BRIDGE.get_ingredient_by_name(name as string),
    };
  });

  return recipe;
}

/** Builds a RecipeContext with the requested RecipeIDs populated via {@link makeMockRecipe} */
export function makeMockRecipeContext(recipeIds: RecipeID[]) {
  const recipeCtx = makeEmptyRecipeContext();
  for (const recipeId of recipeIds) {
    recipeCtx.recipes[recipeIdToIdx(recipeId)] = makeMockRecipe(recipeId);
  }
  return recipeCtx;
}

/** Returns the zero-based column index of a comp key in the composition table header */
export function getCompColumnIdx(container: HTMLElement, compKey: CompKey): number {
  const headers = Array.from(
    container.querySelectorAll("#composition-breakdown-table thead tr:first-child th"),
  );
  return headers.findIndex((th) => th.textContent === comp_key_as_med_str(compKey));
}

/** Returns the label for a CompKey */
export const getCompLabel = (compKey: CompKey) => prop_key_as_med_str(compToPropKey(compKey));

/** Returns the label for an FpdKey */
export const getFpdLabel = (fpdKey: FpdKey) => prop_key_as_med_str(fpdToPropKey(fpdKey));

/** Returns the index of the requested propKey in the list of displayed labels */
export const getPropIndex = (labels: string[], propKey: PropKey) =>
  labels.indexOf(propKeyAsModifiedShortStr(propKey));

/** Finds a `RecipeSelect` element and selects the requested RecipeID */
export async function setRecipeSelect(container: HTMLElement, optionValue: RecipeID) {
  await selectOption(container, "#recipe-selection", recipeIdToOption(optionValue));
}

/** Find a `KeyFilterSelect` element and select the requested key filter option. */
export async function setKeyFilterSelect(container: HTMLElement, optionValue: KeyFilter) {
  await selectOption(container, "#key-filter-select", optionValue);
}

/** Find a `QtyToggle` element and select the requested quantity toggle option. */
export async function setQtyToggle(container: HTMLElement, optionValue: QtyToggle) {
  await selectOption(container, "#qty-toggle-select", QTY_TOGGLE_SHORT_LABELS[optionValue]);
}

/** Find a `DeltaToggle` element and select the requested delta toggle option. */
export async function setDeltaToggle(container: HTMLElement, optionValue: DeltaToggle) {
  await selectOption(container, "#delta-toggle-select", DELTA_TOGGLE_SHORT_LABELS[optionValue]);
}

/** Find the 'Clear' button in `RecipeEditor` */
export async function getClearRecipeButton(container: HTMLElement) {
  const button = within(container).getByRole("button", { name: /Clear/i });
  expect(button).toBeInTheDocument();
  return button;
}

/** Waits for the custom-keys settings button to appear */
export async function waitForCustomKeysButton(container: HTMLElement) {
  await waitFor(() =>
    expect(container.querySelector("#customize-keys-button")).toBeInTheDocument(),
  );
}

/** Opens the custom-keys popup by clicking the settings button. */
export async function openCustomKeyFilters(container: HTMLElement) {
  const customKeysBtn = container.querySelector("#customize-keys-button") as HTMLButtonElement;
  fireEvent.click(customKeysBtn);
  await waitFor(() => expect(screen.getByText("All Properties")).toBeInTheDocument());
}

/** Configures all custom keys by selecting the "All Properties" checkbox. */
export async function configCustomKeysAll(container: HTMLElement) {
  await setKeyFilterSelect(container, KeyFilter.Custom);
  await waitForCustomKeysButton(container);
  await openCustomKeyFilters(container);

  const listItem = screen.getByText(/All Properties/i).closest("li");
  const allPropsCheckbox = within(listItem!).getByRole("checkbox");
  expect(allPropsCheckbox).toBeInTheDocument();
  fireEvent.click(allPropsCheckbox);
}
