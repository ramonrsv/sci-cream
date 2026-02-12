import "@testing-library/jest-dom/vitest";

import { expect } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";

import { propKeyAsModifiedMedStr } from "@/app/properties-chart";
import { makeEmptyRecipeContext } from "@/app/recipe";
import { KeyFilter } from "@/lib/ui/key-filter-select";

import {
  CompKey,
  FpdKey,
  PropKey,
  compToPropKey,
  fpdToPropKey,
  prop_key_as_med_str,
  new_ingredient_database_seeded_from_embedded_data,
  Bridge as WasmBridge,
} from "@workspace/sci-cream";

import { REF_LIGHT_RECIPE } from "@/__tests__/assets";

export const WASM_BRIDGE = new WasmBridge(new_ingredient_database_seeded_from_embedded_data());

export function createMockRecipeContext(nonEmptyRecipes: boolean[] = []) {
  const recipeCtx = makeEmptyRecipeContext();
  nonEmptyRecipes.forEach((isEmpty, index) => {
    recipeCtx.recipes[index].mixTotal = isEmpty ? 100 : undefined;
  });
  return recipeCtx;
}

export function createMockRefRecipeContext() {
  const recipeCtx = makeEmptyRecipeContext();
  recipeCtx.recipes[0].mixTotal = 612;
  recipeCtx.recipes[0].mixProperties =
    WASM_BRIDGE.calculate_recipe_mix_properties(REF_LIGHT_RECIPE);
  return recipeCtx;
}

export const getCompLabel = (compKey: CompKey) => prop_key_as_med_str(compToPropKey(compKey));
export const getFpdLabel = (fpdKey: FpdKey) => prop_key_as_med_str(fpdToPropKey(fpdKey));

export const getPropIndex = (labels: string[], propKey: PropKey) =>
  labels.indexOf(propKeyAsModifiedMedStr(propKey));

export async function selectKeyFilter(container: HTMLElement, optionValue: KeyFilter) {
  const filterSelect = container.querySelector("#key-filter-select select") as HTMLSelectElement;
  expect(filterSelect).toBeInTheDocument();
  fireEvent.change(filterSelect, { target: { value: optionValue } });
}

export async function configCustomKeysAll(container: HTMLElement) {
  await selectKeyFilter(container, KeyFilter.Custom);
  await waitFor(() =>
    expect(container.querySelector("#customize-keys-button")).toBeInTheDocument(),
  );

  const customKeysBtn = container.querySelector("#customize-keys-button") as HTMLButtonElement;
  fireEvent.click(customKeysBtn);
  await waitFor(() => expect(screen.getByText("All Properties")).toBeInTheDocument());

  const listItem = screen.getByText(/All Properties/i).closest("li");
  const allPropsCheckbox = within(listItem!).getByRole("checkbox");
  expect(allPropsCheckbox).toBeInTheDocument();
  fireEvent.click(allPropsCheckbox);
}
