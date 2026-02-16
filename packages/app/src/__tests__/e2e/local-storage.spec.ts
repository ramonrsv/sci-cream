import { test, expect } from "@playwright/test";

import { RecipeID } from "@/__tests__/assets";
import { expectRecipePasteCompleted, pasteRecipeAndWaitForUpdate } from "@/__tests__/e2e/util";

import { sleep_ms } from "@/lib/util";

test.describe("Local Storage Functionality", () => {
  test("recipes should be stored in local storage and persist across page reloads", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    await page.goto("");
    await page.waitForLoadState("networkidle");

    for (const recipeId of [RecipeID.Main, RecipeID.RefA, RecipeID.RefB])
      await pasteRecipeAndWaitForUpdate(page, browserName, recipeId);

    // Wait for interval to save to local storage
    await sleep_ms(2000);

    const recipes = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem("recipes") || "[]");
    });
    expect(recipes).toHaveLength(3);

    // Reload the page to check persistence
    await page.reload();
    await page.waitForLoadState("networkidle");

    for (const recipeId of [RecipeID.Main, RecipeID.RefA, RecipeID.RefB]) {
      await expectRecipePasteCompleted(page, recipeId);
    }
  });
});
