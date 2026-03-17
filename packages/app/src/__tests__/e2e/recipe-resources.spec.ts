import { test, expect, Page } from "@playwright/test";

import { RecipeID, getLightRecipe } from "@/__tests__/assets";

import {
  getExpectedRecipeUpdateValues,
  getRecipeUpdateCheckElements,
  pasteRecipeIntoGrid,
  expectRecipePasteCompleted,
  loginAsTestUserWithCredentials,
} from "@/__tests__/e2e/util";

import { sleep_ms } from "@/lib/util";

import { TEST_USER_B } from "@/lib/database/util";

test.describe("Recipe Resources", () => {
  test("valid-ingredients datalist is present and has options", async ({ page }) => {
    await page.goto("");
    await page.waitForLoadState("networkidle");

    const datalist = page.locator("#valid-ingredients");
    await expect(datalist).toBeAttached();
    const optionCount = await page.locator("#valid-ingredients option").count();
    expect(optionCount).toBeGreaterThanOrEqual(88);
  });

  /** Simulates slow fetch API responses, used to validate that UI updates are resilient to slow
   * loading of user-defined ingredient specs, and unaffected if not using user-defined ingredients.
   */
  const simulateSlowFetchApiResponse = async (page: Page, delayMs: number) => {
    await page.route("**/*", async (route) => {
      const method = route.request().method();
      const headers = route.request().headers();

      if (method === "POST" && headers["next-action"]) {
        await sleep_ms(delayMs);
      }

      await route.continue();
    });
  };

  test("recipe without user-defined ingredients should be unaffected by slow fetches", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    await simulateSlowFetchApiResponse(page, 2000);

    const gotoStart = Date.now();
    await page.goto("");
    await page.waitForLoadState("domcontentloaded");

    const pasteStart = Date.now();
    for (const recipeId of [RecipeID.Main, RecipeID.RefA, RecipeID.RefB]) {
      await pasteRecipeIntoGrid(page, browserName, recipeId);
    }
    const pasteEnd = Date.now();

    for (const recipeId of [RecipeID.Main, RecipeID.RefA, RecipeID.RefB]) {
      await expectRecipePasteCompleted(page, recipeId);
    }
    const updateEnd = Date.now();

    const pasteTime = pasteEnd - pasteStart;
    const updateTime = updateEnd - gotoStart;

    expect(pasteTime).toBeLessThan(2000);
    expect(updateTime).toBeLessThan(2000);
  });

  // Simulates slow fetch API calls to ensure that recipe paste remains responsive and that the UI
  // updates correctly once the data is available. It should fail if the `useEffect` in `RecipeGrid`
  // to "Prevent stale ingredient rows if pasted quickly whilst... still loading..." is removed.
  test("recipe with user-defined ingredients should be resilient to slow fetches", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    page.on("console", (msg) => {
      console.log(`${msg.text()}`);
    });

    await simulateSlowFetchApiResponse(page, 2000);

    await page.goto("");
    await page.waitForLoadState("networkidle");
    await loginAsTestUserWithCredentials(page, TEST_USER_B);

    const gotoStart = Date.now();
    await page.goto("");
    await page.waitForLoadState("domcontentloaded");

    const pasteStart = Date.now();
    for (const recipeId of [
      RecipeID.MainWithUserDefined,
      RecipeID.RefAWithUserDefined,
      RecipeID.RefBWithUserDefined,
    ]) {
      await pasteRecipeIntoGrid(page, browserName, recipeId);

      const expected = getExpectedRecipeUpdateValues(getLightRecipe(recipeId));
      const elements = await getRecipeUpdateCheckElements(page, recipeId);
      await expect(elements.ingNameInput).toHaveValue(expected.ingName);
      await expect(elements.ingQtyInput).toHaveValue(expected.ingQty);
      await expect(elements.propServingTemp).toBeVisible();
      await expect(elements.propServingTemp).not.toHaveText(expected.servingTemp);
    }
    const pasteEnd = Date.now();

    for (const recipeId of [
      RecipeID.MainWithUserDefined,
      RecipeID.RefAWithUserDefined,
      RecipeID.RefBWithUserDefined,
    ]) {
      await expectRecipePasteCompleted(page, recipeId);
    }
    const updateEnd = Date.now();

    const pasteTime = pasteEnd - pasteStart;
    const updateTime = updateEnd - gotoStart;

    expect(pasteTime).toBeLessThan(2000);
    expect(updateTime).toBeGreaterThan(2000);
  });
});
