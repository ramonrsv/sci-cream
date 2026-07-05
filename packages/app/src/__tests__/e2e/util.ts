import { expect, type Page, type Locator } from "@playwright/test";

import {
  CompKey,
  comp_key_as_med_str,
  FpdKey,
  fpdToPropKey,
  PropKey,
  prop_key_as_med_str,
  getMixProperty,
  type LightRecipe,
} from "@workspace/sci-cream";

import { Metric } from "@/app/_elements/web-vitals";
import { formatCompositionValue, applyQtyToggleAndFormat } from "@/lib/comp-value-format";
import { QtyToggle } from "@/app/_elements/selects/qty-toggle-select";
import { KeyFilter } from "@/app/_elements/selects/key-filter-select";

import { verify } from "@/lib/util";

import { getSelectControl, selectOption } from "@/__tests__/e2e/select";

import {
  RecipeID,
  getLightRecipe,
  getRecipeText,
  recipeIdToIdx,
  recipeIdToOption,
} from "@/__tests__/assets";

import { WASM_BRIDGE } from "@/__tests__/util";
import { STORAGE_KEYS } from "@/lib/local-storage";

declare global {
  interface Window {
    __webVitals: Record<string, Metric>;
  }
}

/**
 * Expand the sidebar navbar so the hidden buttons, e.g. `ThemeSelect`, are visible and not clipped.
 * The navbar is collapsed by default (`DEFAULT_COLLAPSED_NAVBAR = true`), behind `overflow-hidden`.
 */
export async function expandNavbar(page: Page) {
  await page.locator("#expand-sidebar-button").click();
  await expect(page.locator("#collapse-sidebar-button")).toBeVisible();
}

/** Get `RecipeEditorPanel`'s recipe selector element, in `RecipeSelect` */
export function getRecipeEditorPanelRecipeSelector(page: Page) {
  return getSelectControl(page, "#recipe-editor-panel #recipe-selection");
}

/** Get ingredient name search input element at the given index */
export function getIngredientNameInputAtIdx(page: Page, index: number) {
  return page.locator('input[type="search"]').nth(index);
}

/** Get ingredient quantity number input element at the given index */
export function getIngredientQtyInputAtIdx(page: Page, index: number) {
  return page.locator('input[type="number"]').nth(index);
}

/** Get `PropertiesPanel`'s `QtyToggle` select input element, in `QtyToggleSelect` */
export function getPropertiesPanelQtyToggleSelectInput(page: Page) {
  return getSelectControl(page, "#properties-panel #qty-toggle-select");
}

/** Get `PropertiesPanel`'s `KeyFilter` select input element, in `KeyFilterSelect` */
export function getPropertiesPanelKeyFilterSelectInput(page: Page) {
  return getSelectControl(page, "#properties-panel #key-filter-select");
}

/** Get `PropertiesPanel`'s `DeltaToggle` select input element, in `DeltaToggleSelect` */
export function getPropertiesPanelDeltaToggleSelectInput(page: Page) {
  return getSelectControl(page, "#properties-panel #delta-toggle-select");
}

/** Get the global `GroupBy` listbox control in the navbar `GroupBySelect`. */
export function getGroupBySelectInput(page: Page) {
  return getSelectControl(page, "#group-by-select");
}

/** Get `CompositionBreakdownPanel`'s recipe selector element, in `RecipeSelect` */
export function getCompositionBreakdownPanelRecipeSelector(page: Page) {
  return getSelectControl(page, "#composition-breakdown-panel #recipe-selection");
}

/** Get `CompositionBreakdownPanel`'s `QtyToggle` select input element, in `QtyToggleSelect` */
export function getCompositionBreakdownPanelQtyToggleSelectInput(page: Page) {
  return getSelectControl(page, "#composition-breakdown-panel #qty-toggle-select");
}

/** Get `CompositionBreakdownPanel`'s `KeyFilter` select input element, in `KeyFilterSelect` */
export function getCompositionBreakdownPanelKeyFilterSelectInput(page: Page) {
  return getSelectControl(page, "#composition-breakdown-panel #key-filter-select");
}

/** Get `PropertiesPanel`'s value cell element for the given property key and recipe index */
export function getPropertiesPanelValueElement(
  page: Page,
  propKey: PropKey,
  recipeIdx: number = 0,
) {
  return page
    .locator("#properties-panel table tbody tr")
    .filter({ has: page.locator("td", { hasText: prop_key_as_med_str(propKey) }) })
    .locator("td.comp-val")
    .nth(recipeIdx);
}

/**
 * Compute the rendered column index for `recipeId` in panels that drop empty reference slots.
 *
 * Mirrors `filterActiveSlots` (see `lib/recipe.ts`): the main slot is always at column 0, and each
 * populated reference slot occupies the next column in slot-index order. With a gap (e.g. Main +
 * RefB but not RefA), RefB renders at column 1 even though its logical slot index is 2.
 */
export function renderedRecipeColumnIdx(
  recipeId: RecipeID,
  populatedRecipeIds: RecipeID[],
): number {
  const slotIdx = recipeIdToIdx(recipeId);
  if (slotIdx === 0) return 0;

  const refSlots = populatedRecipeIds.map(recipeIdToIdx).filter((idx) => idx !== 0);
  const pos = refSlots.indexOf(slotIdx);

  verify(pos !== -1, `${recipeId} (slot ${slotIdx}) is not in populatedRecipeIds`);
  return 1 + pos;
}

/** Get all header cell elements in the `CompositionBreakdownTable` */
export function getCompositionBreakdownTableHeaders(page: Page) {
  return page.locator("#composition-breakdown-panel #composition-breakdown-table table thead th");
}

/** Get the `CompBreakdownTable`'s value cell element for the given ingredient index and comp key */
export async function getCompositionBreakdownTableValueElement(
  page: Page,
  ingIdx: number,
  compKey: CompKey,
) {
  const headersTxt = await getCompositionBreakdownTableHeaders(page).allTextContents();
  const colIdx = headersTxt.findIndex((text) => text.includes(comp_key_as_med_str(compKey)));

  return page
    .locator("#composition-breakdown-panel #composition-breakdown-table table tbody tr")
    .nth(ingIdx)
    .locator("td")
    .nth(colIdx);
}

/** Write text to the clipboard, using browser-appropriate permissions */
export async function pasteToClipboard(page: Page, browserName: string, text: string) {
  if (browserName === "webkit") {
    throw new Error("Clipboard API not supported in WebKit/Safari");
  }

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

/** Get the recipe-editor Clear button element */
export function getClearButton(page: Page) {
  return page.getByRole("button", { name: "Clear recipe", exact: true });
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

/** Get used JS heap size in bytes; only supported in Chromium-based browsers */
export async function getUsedJSHeapSize(page: Page, browser: string): Promise<number> {
  return (await getMemoryUsage(page, browser)).usedJSHeapSize;
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
 * **Note:** This function may fail if component aren't configured correctly, e.g. if
 * `RecipeEditor`'s recipe-select isn't set to the correct recipe, if `CompositionBreakdownPanel`'s
 * key filter isn't set to 'All' or if its recipe-select isn't set to the correct recipe, etc. It is
 * the responsibility of the caller to ensure that components are in the correct state before
 * calling this function. See `configureComponentsForRecipeUpdateCheck` for a helper function.
 */
export async function getRecipeUpdateCheckElements(
  page: Page,
  recipeId: RecipeID,
  ingIdx: number = PASTE_CHECK_DEFAULT_ING_IDX,
  populatedRecipeIds?: RecipeID[],
): Promise<RecipeUpdateCheckElements> {
  const recipeIdx = populatedRecipeIds
    ? renderedRecipeColumnIdx(recipeId, populatedRecipeIds)
    : recipeIdToIdx(recipeId);

  const servingTempPropKey = fpdToPropKey(FpdKey.ServingTemp);

  const ingNameInput = getIngredientNameInputAtIdx(page, ingIdx);
  const ingQtyInput = getIngredientQtyInputAtIdx(page, ingIdx);
  const propServingTemp = getPropertiesPanelValueElement(page, servingTempPropKey, recipeIdx);
  const ingCompPac = await getCompositionBreakdownTableValueElement(page, ingIdx, CompKey.TotalPAC);

  return { ingIdx, ingNameInput, ingQtyInput, propServingTemp, ingCompPac };
}

/** Helper function to set up components for recipe update checks */
export async function configureComponentsForRecipeUpdateCheck(page: Page, recipeId: RecipeID) {
  const editorRecipeSelect = getRecipeEditorPanelRecipeSelector(page);
  const compRecipeSelect = getCompositionBreakdownPanelRecipeSelector(page);
  const compKeyFilterSelect = getCompositionBreakdownPanelKeyFilterSelectInput(page);

  await selectOption(page, editorRecipeSelect, recipeIdToOption(recipeId));
  await selectOption(page, compKeyFilterSelect, KeyFilter.All);

  // `CompBreakdownPanel`'s recipe-select is not rendered if it was previously set to Main and only
  // the main recipe is non-empty. In that case, it's already in the correct state, so we skip
  // selecting the recipe when its trigger is absent.
  if (await compRecipeSelect.isVisible()) {
    await selectOption(page, compRecipeSelect, recipeIdToOption(recipeId));
  }
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
  const ingCompPacVal = ingComp.get(CompKey.TotalPAC);

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
  timeout?: number,
) {
  await expect(elements.ingNameInput).toHaveValue(expected.ingName, { timeout });
  await expect(elements.ingQtyInput).toHaveValue(expected.ingQty, { timeout });
  await expect(elements.propServingTemp).toHaveText(expected.servingTemp, { timeout });
  await expect(elements.ingCompPac).toHaveText(expected.ingCompPac, { timeout });
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
  populatedRecipeIds?: RecipeID[],
  timeout?: number,
) {
  await configureComponentsForRecipeUpdateCheck(page, recipeId);

  const elements = await getRecipeUpdateCheckElements(
    page,
    recipeId,
    expected.ingIdx,
    populatedRecipeIds,
  );
  await expectRecipeElementsToHaveExpected(elements, expected, timeout);
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
export async function expectRecipePasteCompleted(
  page: Page,
  recipeId: RecipeID,
  populatedRecipeIds?: RecipeID[],
  timeout?: number,
) {
  const lightRecipe = getLightRecipe(recipeId);
  const ingIdx = PASTE_CHECK_DEFAULT_ING_IDX;

  const expected = getExpectedRecipeUpdateValues(lightRecipe, ingIdx);
  await expectRecipeUpdateCompleted(page, recipeId, expected, populatedRecipeIds, timeout);
}

/**
 * Helper function to paste a recipe into a `RecipeEditor`, based on the recipe ID
 *
 * This function selects the recipe in `RecipeEditor`, pastes the recipe text to the clipboard, and
 * clicks the paste button, but does not wait for the recipe update to be reflected in the relevant
 * components. It is the responsibility of the caller to wait for the update completion if needed,
 * e.g. by calling `expectRecipePasteCompleted`.
 *
 * **Note:** This function modifies selectors to paste recipes in corresponding `RecipeEditor`
 * slots, so it may not leave components in the same state that they were before the function call.
 */
export async function pasteRecipeIntoEditor(page: Page, browserName: string, recipeId: RecipeID) {
  const editorRecipeSelect = getRecipeEditorPanelRecipeSelector(page);
  await selectOption(page, editorRecipeSelect, recipeIdToOption(recipeId));

  await pasteToClipboard(page, browserName, getRecipeText(recipeId));
  const pasteButton = getPasteButton(page);

  await waitForRecipeEditorHydrationReady(page);
  await pasteButton.click();
}

/**
 * Helper function to paste recipe and wait for update completion, used in multiple tests
 *
 * This function selects the recipe in `RecipeEditor`, pastes the recipe text to the clipboard,
 * clicks the paste button, and waits for the recipe update to be reflected in the components.
 *
 * **Note:** This function modifies selectors to paste recipes in corresponding `RecipeEditor`
 * slots, so it may not leave components in the same state that they were before the function call.
 */
export async function pasteRecipeAndWaitForUpdate(
  page: Page,
  browserName: string,
  recipeId: RecipeID,
  populatedRecipeIds?: RecipeID[],
  timeout?: number,
) {
  await pasteRecipeIntoEditor(page, browserName, recipeId);
  await expectRecipePasteCompleted(page, recipeId, populatedRecipeIds, timeout);
}

/**
 * Helper function to fill a recipe into a `RecipeEditor`, based on the recipe ID
 *
 * This function selects the recipe in `RecipeEditor`, fills each ingredient name and quantity input
 * based on the recipe, but does not wait for the recipe update to be reflected in the relevant
 * components. It is the responsibility of the caller to wait for the update completion if needed,
 * e.g. by calling `expectRecipePasteCompleted`.
 *
 * **Note:** This function modifies selectors to fill recipes in corresponding `RecipeEditor` slots,
 * so it may not leave components in the same state that they were before the function call.
 */
export async function fillRecipeIntoEditor(page: Page, recipeId: RecipeID) {
  const editorRecipeSelect = getRecipeEditorPanelRecipeSelector(page);
  await selectOption(page, editorRecipeSelect, recipeIdToOption(recipeId));

  await waitForRecipeEditorHydrationReady(page);

  for (const [ingIdx, [name, qty]] of getLightRecipe(recipeId).entries()) {
    const ingNameInput = getIngredientNameInputAtIdx(page, ingIdx);
    const ingQtyInput = getIngredientQtyInputAtIdx(page, ingIdx);

    await ingNameInput.fill(name as string);
    await ingQtyInput.fill(String(qty));
  }
}

/**
 * Wait until recipe-editor hydration from local storage has settled.
 *
 * `RecipeEditor` mounts with empty rows, then rehydrates from storage in a `useEffect`. If a test
 * starts typing during that window, the hydration update can overwrite user input and produce
 * flaky assertions. We treat hydration as "ready" once the first row's name/qty inputs stay
 * unchanged for a short stability window.
 */
export async function waitForRecipeEditorHydrationReady(page: Page) {
  const nameInput = getIngredientNameInputAtIdx(page, 0);
  const qtyInput = getIngredientQtyInputAtIdx(page, 0);

  await expect(nameInput).toBeVisible();
  await expect(qtyInput).toBeVisible();

  const stableWindowMs = 300;
  const maxWaitMs = 5000;

  await expect(async () => {
    const valuesBefore = await Promise.all([nameInput.inputValue(), qtyInput.inputValue()]);
    await page.waitForTimeout(stableWindowMs);
    const valuesAfter = await Promise.all([nameInput.inputValue(), qtyInput.inputValue()]);

    expect(valuesBefore).toEqual(valuesAfter);
  }).toPass({ timeout: maxWaitMs });
}

/**
 * Helper function to fill a recipe and wait for update completion, used in multiple tests
 *
 * This function selects the recipe in `RecipeEditor`, fills each ingredient name and quantity input
 * based on the recipe, and waits for the recipe update to be reflected in the relevant components.
 *
 * **Note:** This function modifies selectors to fill recipes in corresponding slots in
 * `RecipeEditor`, so it may not leave components in the same state that they were before the call.
 */
export async function fillRecipeAndWaitForUpdate(page: Page, recipeId: RecipeID, timeout?: number) {
  await fillRecipeIntoEditor(page, recipeId);
  await expectRecipePasteCompleted(page, recipeId, undefined, timeout);
}

/**
 * Helper function to clear recipe and wait for update completion, used in multiple tests
 *
 * **Note:** This function modifies selectors to clear recipes in corresponding `RecipeEditor`
 * slots, so it may not leave components in the same state that they were before the function call.
 */
export async function clearRecipeAndWaitForUpdate(page: Page, recipeId: RecipeID) {
  const ingIdx = PASTE_CHECK_DEFAULT_ING_IDX;

  const editorRecipeSelect = getRecipeEditorPanelRecipeSelector(page);
  const clearButton = getClearButton(page);

  await selectOption(page, editorRecipeSelect, recipeIdToOption(recipeId));
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

/** Escape any regex metacharacters in `s` so it can be embedded in a `RegExp` literal */
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Locator for a `.search-list-item` whose title span (the `.text-primary` child) is exactly
 * `name`. Avoids substring collisions where `hasText: name` would also match longer names
 * containing `name` as a prefix/substring (e.g. "Sugar-Free Base" vs the seeded longer
 * "Sugar-Free Base (with user-defined)").
 */
function searchListItemByName(page: Page, name: string) {
  return page
    .locator(".search-list-item")
    .filter({
      has: page.locator(".text-primary", { hasText: new RegExp(`^${escapeRegExp(name)}$`) }),
    });
}

/** On the `/recipes` page, select a recipe by its name and wait for the detail panel to appear */
export async function selectRecipeByName(page: Page, name: string) {
  await searchListItemByName(page, name).first().click();
  await expect(page.locator(".search-detail-panel")).toBeVisible();
}

/** On the `/ingredients` page, select an entry by its name and wait for the detail panel */
export async function selectIngredientByName(page: Page, name: string) {
  await searchListItemByName(page, name).first().click();
  await expect(page.locator(".search-detail-panel")).toBeVisible();
}

/** Navigate to the / page and paste the given recipes, with support for missing recipe IDs */
export async function goToPageAndPasteRecipes(
  page: Page,
  browserName: string,
  recipeIds: RecipeID[],
) {
  await goToPageAndWaitFor(page);

  const populated: RecipeID[] = [];
  for (const recipeId of recipeIds) {
    populated.push(recipeId);
    await pasteRecipeAndWaitForUpdate(page, browserName, recipeId, populated);
  }
}

/**
 * Inject a watcher-selection list into `localStorage` before navigation, so that `WatchersView`'s
 * mount-time hydration picks it up. Use to control which cards appear in screenshot tests.
 */
export async function presetWatcherSelection(page: Page, propKeys: PropKey[]) {
  const key = `${STORAGE_KEYS.watchersPanelView}:selected`;

  await page.addInitScript(
    ([k, keys]) => {
      localStorage.setItem(k, JSON.stringify(keys));
    },
    [key, propKeys.map(String)] as const,
  );
}

/**
 * Inject a `PropKey`-to-target map into `localStorage` before navigation for the calculator page's
 * mount-time hydration; drives the chart's target ticks (and the watchers) in screenshot tests.
 */
export async function presetWatcherTargets(page: Page, targets: Record<string, number>) {
  await page.addInitScript(
    ([k, t]) => {
      localStorage.setItem(k, JSON.stringify(t));
    },
    [STORAGE_KEYS.watcherTargets, targets] as const,
  );
}

/** Locate a watcher card by its `PropKey` and assert that it is visible. */
export async function locateWatcherCardByKeyAndExpectVisible(page: Page, propKey: PropKey) {
  const card = page.locator(`[data-testid="watcher-card-${propKey}"]`);
  await expect(card).toBeVisible();
  return card;
}
