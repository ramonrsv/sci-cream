import { expect, type Page, type Locator } from "@playwright/test";

import {
  CompKey,
  comp_key_as_med_str,
  FpdKey,
  fpdToPropKey,
  PropKey,
  prop_key_as_med_str,
  getMixProperty,
} from "@workspace/sci-cream";

import { Metric } from "@/app/_elements/web-vitals";
import { formatCompositionValue, applyQtyToggleAndFormat } from "@/lib/comp-value-format";
import { QtyToggle } from "@/app/_elements/selects/qty-toggle-select";
import { KeyFilter } from "@/app/_elements/selects/key-filter-select";

import {
  LightRecipe,
  RecipeID,
  getLightRecipe,
  getRecipeText,
  recipeIdToIdx,
  recipeIdToOption,
} from "@/__tests__/assets";

import { WASM_BRIDGE } from "@/__tests__/util";

declare global {
  interface Window {
    __webVitals: Record<string, Metric>;
  }
}

/** Get `RecipeGrid`'s recipe selector element, in `RecipeSelect` */
export function getRecipeGridRecipeSelector(page: Page) {
  return page.locator("#recipe-grid #recipe-selection select").first();
}

/** Get ingredient name search input element at the given index */
export function getIngredientNameInputAtIdx(page: Page, index: number) {
  return page.locator('input[type="search"]').nth(index);
}

/** Get ingredient quantity number input element at the given index */
export function getIngredientQtyInputAtIdx(page: Page, index: number) {
  return page.locator('input[type="number"]').nth(index);
}

/** Get `MixPropertiesGrid`'s `QtyToggle` select input element, in `QtyToggleSelect` */
export function getMixPropertiesQtyToggleSelectInput(page: Page) {
  return page.locator("#mix-properties-grid #qty-toggle-select select").first();
}

/** Get `MixPropertiesGrid`'s `KeyFilter` select input element, in `KeyFilterSelect` */
export function getMixPropertiesKeyFilterSelectInput(page: Page) {
  return page.locator("#mix-properties-grid #key-filter-select select").first();
}

/** Get `IngredientCompositionGrid`'s recipe selector element, in `RecipeSelect` */
export function getCompositionGridRecipeSelector(page: Page) {
  return page.locator("#ing-composition-grid #recipe-selection select").first();
}

/** Get `IngredientCompositionGrid`'s `QtyToggle` select input element, in `QtyToggleSelect` */
export function getCompositionGridQtyToggleSelectInput(page: Page) {
  return page.locator("#ing-composition-grid #qty-toggle-select select").first();
}

/** Get `IngredientCompositionGrid`'s `KeyFilter` select input element, in `KeyFilterSelect` */
export function getCompositionGridKeyFilterSelectInput(page: Page) {
  return page.locator("#ing-composition-grid #key-filter-select select").first();
}

/** Get `MixPropertiesGrid`'s value cell element for the given property key and recipe index */
export function getMixPropertyValueElement(page: Page, propKey: PropKey, recipeIdx: number = 0) {
  return page
    .locator("#mix-properties-grid table tbody tr")
    .filter({ has: page.locator("td", { hasText: prop_key_as_med_str(propKey) }) })
    .locator("td.comp-val")
    .nth(recipeIdx);
}

/** Get all header cell elements in the `IngredientCompositionGrid` */
export function getCompositionGridHeaders(page: Page) {
  return page.locator("#ing-composition-grid #ing-composition-table table thead th");
}

/** Get the `IngCompositionGrid`'s value cell element for the given ingredient index and comp key */
export async function getCompositionValueElement(page: Page, ingIdx: number, compKey: CompKey) {
  const headersTxt = await getCompositionGridHeaders(page).allTextContents();
  const colIdx = headersTxt.findIndex((text) => text.includes(comp_key_as_med_str(compKey)));

  return page
    .locator("#ing-composition-grid #ing-composition-table table tbody tr")
    .nth(ingIdx)
    .locator("td")
    .nth(colIdx);
}

/** Write text to the clipboard, using browser-appropriate permissions */
export async function pasteToClipboard(page: Page, browserName: string, text: string) {
  const permissions = browserName === "firefox" ? [] : ["clipboard-read", "clipboard-write"];
  page.context().grantPermissions(permissions);

  await page.evaluate(async (text) => {
    await navigator.clipboard.writeText(text);
  }, text);
}

/** Get the Paste button element */
export function getPasteButton(page: Page) {
  return page.getByRole("button", { name: "Paste" });
}

/** Get the Clear button element */
export function getClearButton(page: Page) {
  return page.getByRole("button", { name: "Clear" });
}

/** Get signin page email input element */
export function getSigninEmailInput(page: Page) {
  return page.getByPlaceholder("Email");
}

/** Get signin page password input element */
export function getSigninPasswordInput(page: Page) {
  return page.getByPlaceholder("Password");
}

/** Get signin page submit button element for signing in with email */
export function getSigninWithEmailButton(page: Page) {
  return page.getByRole("button", { name: /sign in with email/i });
}

/** Get signup page name input element */
export function getSignupNameInput(page: Page) {
  return page.getByPlaceholder("Name");
}

/** Get signup page email input element */
export function getSignupEmailInput(page: Page) {
  return page.getByPlaceholder("Email");
}

/** Get signup page password input element */
export function getSignupPasswordInput(page: Page) {
  return page.getByPlaceholder("Password (min. 8 characters)");
}

/** Get signup page confirm password input element */
export function getSignupConfirmPasswordInput(page: Page) {
  return page.getByPlaceholder("Confirm password");
}

/** Get signup page submit button element for creating an account */
export function getSignupButton(page: Page) {
  return page.locator("#signup-button");
}

/** JS heap memory usage snapshot from the Chromium Performance API */
export type MemoryUsage = {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
};

/** Chromium-specific extension to the Performance API that exposes memory usage */
interface PerformanceWithMemory extends Performance {
  memory: MemoryUsage;
}

/** Get current JS heap memory usage; only supported in Chromium-based browsers */
export async function getMemoryUsage(page: Page, browser: string): Promise<MemoryUsage> {
  if (browser !== "chromium") {
    throw new Error("Memory usage measurement is only supported in Chromium-based browsers");
  }

  return page.evaluate(() => {
    const mem = (performance as PerformanceWithMemory).memory;
    return {
      usedJSHeapSize: mem.usedJSHeapSize,
      totalJSHeapSize: mem.totalJSHeapSize,
      jsHeapSizeLimit: mem.jsHeapSizeLimit,
    };
  });
}

/** Get used JS heap size in megabytes; only supported in Chromium-based browsers */
export async function getUsedJSHeapSizeInMB(page: Page, browser: string): Promise<number> {
  return (await getMemoryUsage(page, browser)).usedJSHeapSize / 1024 / 1024;
}

/** Elements used to verify recipe paste, so they can be set up outside of benchmark loops */
export type RecipeUpdateCheckElements = {
  ingIdx: number;
  ingNameInput: Locator;
  ingQtyInput: Locator;
  propServingTemp: Locator;
  ingCompPac: Locator;
};

/**
 * Find elements to check for recipe paste/updates, based on ingredient index
 *
 * **Note:** This function may fail if component aren't configured correctly, e.g. if `RecipeGrid`'s
 * recipe-select isn't set to the correct recipe, if `IngCompGrid`'s key filter isn't set to 'All'
 * or if its recipe-select isn't set to the correct recipe, etc. It is the responsibility of the
 * caller to ensure that components are in the correct state before calling this function.
 * See `configureComponentsForRecipeUpdateCheck` for a helper function that does this.
 */
export async function getRecipeUpdateCheckElements(
  page: Page,
  recipeId: RecipeID,
  ingIdx: number = PASTE_CHECK_DEFAULT_ING_IDX,
): Promise<RecipeUpdateCheckElements> {
  const recipeIdx = recipeIdToIdx(recipeId);
  const servingTempPropKey = fpdToPropKey(FpdKey.ServingTemp);

  const ingNameInput = getIngredientNameInputAtIdx(page, ingIdx);
  const ingQtyInput = getIngredientQtyInputAtIdx(page, ingIdx);
  const propServingTemp = getMixPropertyValueElement(page, servingTempPropKey, recipeIdx);
  const ingCompPac = await getCompositionValueElement(page, ingIdx, CompKey.PACtotal);

  return { ingIdx, ingNameInput, ingQtyInput, propServingTemp, ingCompPac };
}

/** Helper function to set up components for recipe update checks */
export async function configureComponentsForRecipeUpdateCheck(page: Page, recipeId: RecipeID) {
  const recipeGridRecipeSelect = getRecipeGridRecipeSelector(page);
  const compGridRecipeSelect = getCompositionGridRecipeSelector(page);
  const compGridKeyFilterSelect = getCompositionGridKeyFilterSelectInput(page);

  await recipeGridRecipeSelect.selectOption(recipeIdToOption(recipeId));
  await compGridKeyFilterSelect.selectOption(KeyFilter.All);

  // `IngCompGrid`'s recipe-select is not rendered if it was previously set to Main and only the
  // main recipe is non-empty. In that case, it's already in the correct state and we can safely
  // skip selecting the recipe, so we catch and ignore a timeout trying to select the recipe.
  try {
    await compGridRecipeSelect.selectOption(recipeIdToOption(recipeId), { timeout: 100 });
  } catch {}
}

/** Expected values for a recipe update after paste or quantity change */
export type ExpectedRecipeUpdate = {
  ingIdx: number;
  ingName: string;
  ingQty: string;
  servingTemp: string;
  ingCompPac: string;
};

/** Get expected values for recipe update from light recipe and WASM bridge calculations */
export function getExpectedRecipeUpdateValues(
  lightRecipe: LightRecipe,
  ingIdx: number = PASTE_CHECK_DEFAULT_ING_IDX,
): ExpectedRecipeUpdate {
  const ingName = lightRecipe[ingIdx][0] as string;
  const ingQty = lightRecipe[ingIdx][1] as number;

  const mixProps = WASM_BRIDGE.calculate_recipe_mix_properties(lightRecipe);
  const servingTempVal = getMixProperty(mixProps, fpdToPropKey(FpdKey.ServingTemp));

  const ingComp = WASM_BRIDGE.get_ingredient_by_name(ingName).composition;
  const ingCompPacVal = ingComp.get(CompKey.PACtotal);

  const servingTemp = formatCompositionValue(servingTempVal);
  const ingCompPac = applyQtyToggleAndFormat(
    ingCompPacVal,
    ingQty,
    undefined,
    QtyToggle.Quantity,
    true,
  );

  return { ingIdx, ingName, ingQty: ingQty.toString(), servingTemp, ingCompPac };
}

/** Create `updateCount` expected recipe update values for a given ingredient in a light recipe */
export function makeExpectedRecipeUpdates(
  updateCount: number,
  lightRecipe: LightRecipe,
  ingIdx: number,
): ExpectedRecipeUpdate[] {
  const localLightRecipe = [...lightRecipe];
  const updates: ExpectedRecipeUpdate[] = [];

  for (let i = 0; i < updateCount; i++) {
    (localLightRecipe[ingIdx][1] as number) += 1;
    updates.push(getExpectedRecipeUpdateValues(localLightRecipe, ingIdx));
  }

  return updates;
}

/** Make expected recipe update values for multiple quantity updates for each recipe */
export function makePerRecipeQtyUpdatesExpectedValues(
  updateCount: number,
  recipeIds: RecipeID[],
  ingIdx: number,
): Map<RecipeID, Array<ExpectedRecipeUpdate>> {
  return new Map(
    recipeIds.map((id) => [id, makeExpectedRecipeUpdates(updateCount, getLightRecipe(id), ingIdx)]),
  );
}

/** Expect that recipe update elements have the expected values */
export async function expectRecipeElementsToHaveExpected(
  elements: RecipeUpdateCheckElements,
  expected: ExpectedRecipeUpdate,
) {
  await expect(elements.ingNameInput).toHaveValue(expected.ingName);
  await expect(elements.ingQtyInput).toHaveValue(expected.ingQty);
  await expect(elements.propServingTemp).toHaveText(expected.servingTemp);
  await expect(elements.ingCompPac).toHaveText(expected.ingCompPac);
}

/**
 * Helper function to check for recipe update completion after paste or quantity change
 *
 * **Note:** This function modifies selectors to check for specific ingredient and property values,
 * so it may not leave components in the same state that they were before the function call.
 */
export async function expectRecipeUpdateCompleted(
  page: Page,
  recipeId: RecipeID,
  expected: ExpectedRecipeUpdate,
) {
  await configureComponentsForRecipeUpdateCheck(page, recipeId);

  const elements = await getRecipeUpdateCheckElements(page, recipeId, expected.ingIdx);
  await expectRecipeElementsToHaveExpected(elements, expected);
}

/**
 * Ingredient index to check for name and quantity equality after recipe updates
 *
 * **Note:** This corresponds to 'Fructose' in the main and reference recipes
 */
export const PASTE_CHECK_DEFAULT_ING_IDX = 6;

/**
 * Expect that a recipe paste is reflected in all the relevant components
 *
 * **Note:** This function modifies selectors to check for specific ingredient and property values,
 * so it may not leave components in the same state that they were before the function call.
 */
export async function expectRecipePasteCompleted(page: Page, recipeId: RecipeID) {
  const lightRecipe = getLightRecipe(recipeId);
  const ingIdx = PASTE_CHECK_DEFAULT_ING_IDX;

  const expected = getExpectedRecipeUpdateValues(lightRecipe, ingIdx);
  await expectRecipeUpdateCompleted(page, recipeId, expected);
}

/**
 * Helper function to paste a recipe into a `RecipeGrid`, based on the recipe ID
 *
 * This function selects the recipe in `RecipeGrid`, pastes the recipe text to the clipboard, and
 * clicks the paste button, but does not wait for the recipe update to be reflected in the relevant
 * components. It is the responsibility of the caller to wait for the update completion if needed,
 * e.g. by calling `expectRecipePasteCompleted`.
 *
 * **Note:** This function modifies selectors to paste recipes in corresponding `RecipeGrid` slots,
 * so it may not leave components in the same state that they were before the function call.
 */
export async function pasteRecipeIntoGrid(page: Page, browserName: string, recipeId: RecipeID) {
  const recipeGridRecipeSelect = getRecipeGridRecipeSelector(page);
  await recipeGridRecipeSelect.selectOption(recipeIdToOption(recipeId));

  await pasteToClipboard(page, browserName, getRecipeText(recipeId));
  const pasteButton = getPasteButton(page);
  await pasteButton.click();
}

/**
 * Helper function to paste recipe and wait for update completion, used in multiple tests
 *
 * This function selects the recipe in `RecipeGrid`, pastes the recipe text to the clipboard, clicks
 * the paste button, and waits for the recipe update to be reflected in the relevant components.
 *
 * **Note:** This function modifies selectors to paste recipes in corresponding `RecipeGrid` slots,
 * so it may not leave components in the same state that they were before the function call.
 */
export async function pasteRecipeAndWaitForUpdate(
  page: Page,
  browserName: string,
  recipeId: RecipeID,
) {
  await pasteRecipeIntoGrid(page, browserName, recipeId);
  await expectRecipePasteCompleted(page, recipeId);
}

/**
 * Helper function to fill a recipe into a `RecipeGrid`, based on the recipe ID
 *
 * This function selects the recipe in `RecipeGrid`, fills each ingredient name and quantity input
 * based on the recipe, but does not wait for the recipe update to be reflected in the relevant
 * components. It is the responsibility of the caller to wait for the update completion if needed,
 * e.g. by calling `expectRecipePasteCompleted`.
 *
 * **Note:** This function modifies selectors to fill recipes in corresponding `RecipeGrid` slots,
 * so it may not leave components in the same state that they were before the function call.
 */
export async function fillRecipeIntoGrid(page: Page, recipeId: RecipeID) {
  const recipeGridRecipeSelect = getRecipeGridRecipeSelector(page);
  await recipeGridRecipeSelect.selectOption(recipeIdToOption(recipeId));

  for (const [ingIdx, [name, qty]] of getLightRecipe(recipeId).entries()) {
    const ingNameInput = getIngredientNameInputAtIdx(page, ingIdx);
    const ingQtyInput = getIngredientQtyInputAtIdx(page, ingIdx);

    await ingNameInput.fill(name as string);
    await ingQtyInput.fill(String(qty));
  }
}

/**
 * Helper function to fill a recipe and wait for update completion, used in multiple tests
 *
 * This function selects the recipe in `RecipeGrid`, fills each ingredient name and quantity input
 * based on the recipe, and waits for the recipe update to be reflected in the relevant components.
 *
 * **Note:** This function modifies selectors to fill recipes in corresponding slots in `RecipeGrid,
 * so it may not leave components in the same state that they were before the function call.
 */
export async function fillRecipeAndWaitForUpdate(page: Page, recipeId: RecipeID) {
  await fillRecipeIntoGrid(page, recipeId);
  await expectRecipePasteCompleted(page, recipeId);
}

/**
 * Helper function to clear recipe and wait for update completion, used in multiple tests
 *
 * **Note:** This function modifies selectors to clear recipes in corresponding `RecipeGrid` slots,
 * so it may not leave components in the same state that they were before the function call.
 */
export async function clearRecipeAndWaitForUpdate(page: Page, recipeId: RecipeID) {
  const ingIdx = PASTE_CHECK_DEFAULT_ING_IDX;

  const recipeGridRecipeSelect = getRecipeGridRecipeSelector(page);
  const clearButton = getClearButton(page);

  await recipeGridRecipeSelect.selectOption(recipeIdToOption(recipeId));
  await clearButton.click();

  const elements = await getRecipeUpdateCheckElements(page, recipeId, ingIdx);
  await expect(elements.ingNameInput).toHaveValue("");
  await expect(elements.ingQtyInput).toHaveValue("");
}

/* eslint-disable jsdoc/check-param-names */
/**
 * Helper function to log in as a test user using email and password credentials
 *
 * This function navigates to the sign-in page, fills in the email and password fields,
 * clicks the sign-in button, and waits for navigation to complete.
 *
 * @param testUser - An object containing the email and password of the test user
 */
export async function loginAsTestUserWithCredentials(
  page: Page,
  testUser: { email: string; password: string },
) {
  await page.goto("/signin");
  await getSigninEmailInput(page).fill(testUser.email);
  await getSigninPasswordInput(page).fill(testUser.password);
  await getSigninWithEmailButton(page).click();
  await page.waitForNavigation();
}
/* eslint-enable jsdoc/check-param-names */

/** Enum representing different playwright `Page` load states */
export enum LoadState {
  Load = "load",
  DomContentLoaded = "domcontentloaded",
  NetworkIdle = "networkidle",
}

/**
 * Helper function to navigate to a page and wait for a specific load state
 *
 * This function navigates to the given URL and waits for the specified load state to be reached.
 * By default, it navigates to the root URL and waits for `LoadState::NetworkIdle = "networkidle"`.
 */
export async function goToPageAndWaitFor(
  page: Page,
  url: string = "",
  loadState: LoadState = LoadState.NetworkIdle,
) {
  await page.goto(url);
  await page.waitForLoadState(loadState);
}
