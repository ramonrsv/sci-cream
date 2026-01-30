import { test, expect, type Page } from "@playwright/test";

import {
  pasteToClipboard,
  getPasteButton,
  recipePasteCheckElements,
  recipeUpdateCompleted,
  getRecipeGridRecipeSelector,
  getCompositionGridRecipeSelector,
} from "@/__tests__/util";

import {
  REFERENCE_RECIPE_TEXT,
  LAST_INGREDIENT_IDX,
  EXPECTED_LAST_INGREDIENT,
} from "@/__tests__/assets";

import { sleep_ms } from "@/lib/util";

test.describe("Local Storage Functionality", () => {
  const expectRecipePasteCompleted = async (
    page: Page,
    expected: { name: string; qty: number; servingTemp: string },
  ) => {
    const elements = await recipePasteCheckElements(page, LAST_INGREDIENT_IDX);
    await expect(elements.ingNameInput).toHaveValue(expected.name);
    await expect(elements.ingQtyInput).toHaveValue(expected.qty.toString());
    await expect(elements.propServingTemp).toBeVisible();
  };

  const expectRecipesUpdateCompleted = async (
    page: Page,
    expected: { name: string; qty: number; servingTemp: string; energy: string },
  ) => {
    const recipeGridRecipeSelector = getRecipeGridRecipeSelector(page);
    const compGridRecipeSelector = getCompositionGridRecipeSelector(page);

    for (const recipeIdx of [0, 1, 2]) {
      await recipeGridRecipeSelector.selectOption(recipeIdx.toString());
      await compGridRecipeSelector.selectOption(recipeIdx.toString());

      const elements = await recipePasteCheckElements(page, LAST_INGREDIENT_IDX);
      await recipeUpdateCompleted(page, elements, expected);
    }
  };

  test("recipes should be stored in local storage and persist across page reloads", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    await page.goto("");
    await page.waitForLoadState("networkidle");

    await pasteToClipboard(page, browserName, REFERENCE_RECIPE_TEXT);
    const pasteButton = getPasteButton(page);

    const expected = EXPECTED_LAST_INGREDIENT;

    const recipeGridRecipeSelector = getRecipeGridRecipeSelector(page);

    for (const recipeIdx of [0, 1, 2]) {
      await recipeGridRecipeSelector.selectOption(recipeIdx.toString());
      await pasteButton.click();
      await expectRecipePasteCompleted(page, expected);
    }

    await expectRecipesUpdateCompleted(page, expected);

    // Wait for interval to save to local storage
    await sleep_ms(2000);

    const recipes = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem("recipes") || "[]");
    });
    expect(recipes).toHaveLength(3);

    // Reload the page to check persistence
    await page.reload();
    await page.waitForLoadState("networkidle");

    for (const recipeIdx of [0, 1, 2]) {
      await recipeGridRecipeSelector.selectOption(recipeIdx.toString());
      await expectRecipePasteCompleted(page, expected);
    }
    await expectRecipesUpdateCompleted(page, expected);
  });
});
