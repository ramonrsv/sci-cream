import { test } from "@playwright/test";

import { RecipeID } from "@/__tests__/assets";
import { pasteRecipeAndWaitForUpdate, fillRecipeAndWaitForUpdate } from "@/__tests__/e2e/util";

const RECIPE_IDS_TO_TEST = [RecipeID.Main, RecipeID.RefA, RecipeID.RefB];

test.describe("Recipe Paste and Fill", () => {
  test("recipe paste should function correctly for all recipes", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    await page.goto("");
    await page.waitForLoadState("networkidle");

    for (const recipeId of RECIPE_IDS_TO_TEST)
      await pasteRecipeAndWaitForUpdate(page, browserName, recipeId);
  });

  test("recipe fill should function correctly for all recipes", async ({ page, browserName }) => {
    await page.goto("");
    await page.waitForLoadState("networkidle");

    for (const recipeId of RECIPE_IDS_TO_TEST)
      await fillRecipeAndWaitForUpdate(page, browserName, recipeId);
  });
});
