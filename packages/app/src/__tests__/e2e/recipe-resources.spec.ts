import { test, expect } from "@playwright/test";

import { KeyFilter } from "@/lib/ui/key-filter-select";

import { RecipeID, getRecipeText, getLightRecipe } from "@/__tests__/assets";

import {
  pasteToClipboard,
  getPasteButton,
  getRecipeGridRecipeSelector,
  getCompositionGridRecipeSelector,
  getCompositionGridKeyFilterSelectInput,
  getExpectedRecipeUpdateValues,
  getRecipeUpdateCheckElements,
  expectRecipeElementsToHaveExpected,
} from "@/__tests__/e2e/util";

import { sleep_ms } from "@/lib/util";

test.describe("Recipe Resources", () => {
  test("valid-ingredients datalist is present and has options", async ({ page }) => {
    await page.goto("");
    await page.waitForLoadState("networkidle");

    const datalist = page.locator("#valid-ingredients");
    await expect(datalist).toBeAttached();
    const optionCount = await page.locator("#valid-ingredients option").count();
    expect(optionCount).toBeGreaterThanOrEqual(88);
  });

  // Simulates a slow initial load to ensure that recipe paste remains responsive and that the UI
  // updates correctly once the data is available. It should fail if the `useEffect` in `RecipeGrid`
  // to "Prevent stale ingredient rows if pasted quickly whilst... still loading..." is removed.
  test("recipe paste should be resilient to slow initial load", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    // Simulate slow fetch API responses
    await page.route("**/*", async (route) => {
      const method = route.request().method();
      const headers = route.request().headers();

      if (method === "POST" && headers["next-action"]) {
        await sleep_ms(2000);
      }

      await route.continue();
    });

    const gotoStart = Date.now();
    await page.goto("");
    await page.waitForLoadState("domcontentloaded");

    const pasteButton = getPasteButton(page);

    const recipeGridRecipeSelector = getRecipeGridRecipeSelector(page);
    const compGridRecipeSelector = getCompositionGridRecipeSelector(page);
    const compGridKeyFilterSelect = getCompositionGridKeyFilterSelectInput(page);

    await compGridKeyFilterSelect.selectOption(KeyFilter.All);

    const pasteStart = Date.now();
    for (const recipeId of [RecipeID.Main, RecipeID.RefA, RecipeID.RefB]) {
      await pasteToClipboard(page, browserName, getRecipeText(recipeId));
      await recipeGridRecipeSelector.selectOption(recipeId);
      await pasteButton.click();

      const expected = getExpectedRecipeUpdateValues(getLightRecipe(recipeId));
      const elements = await getRecipeUpdateCheckElements(page, recipeId);
      await expect(elements.ingNameInput).toHaveValue(expected.ingName);
      await expect(elements.ingQtyInput).toHaveValue(expected.ingQty);
      await expect(elements.propServingTemp).toBeVisible();
      await expect(elements.propServingTemp).not.toHaveText(expected.servingTemp);
    }
    const pasteEnd = Date.now();

    for (const recipeId of [RecipeID.Main, RecipeID.RefA, RecipeID.RefB]) {
      await recipeGridRecipeSelector.selectOption(recipeId);
      await compGridRecipeSelector.selectOption(recipeId);

      const elements = await getRecipeUpdateCheckElements(page, recipeId);
      const expected = getExpectedRecipeUpdateValues(getLightRecipe(recipeId));
      await expectRecipeElementsToHaveExpected(elements, expected);
    }
    const updateEnd = Date.now();

    const pasteTime = pasteEnd - pasteStart;
    const updateTime = updateEnd - gotoStart;

    expect(pasteTime).toBeLessThan(2000);
    expect(updateTime).toBeGreaterThan(2000);
  });
});
