import { test } from "@playwright/test";

import { RecipeID } from "@/__tests__/assets";
import {
  pasteRecipeAndWaitForUpdate,
  fillRecipeAndWaitForUpdate,
  loginAsTestUserWithCredentials,
  goToPageAndWaitFor,
} from "@/__tests__/e2e/util";

import { TEST_USER_B } from "@/lib/database/assets";

const RECIPE_IDS_WITHOUT_USER_DEFINED = [RecipeID.Main, RecipeID.RefA, RecipeID.RefB];
const RECIPE_IDS_WITH_USER_DEFINED = [
  RecipeID.MainWithUserDefined,
  RecipeID.RefAWithUserDefined,
  RecipeID.RefBWithUserDefined,
];

// Use a generous timeout for the paste/fill updates to complete, as it involves multiple fetches
// and UI updates. This is mostly to accommodate parallel runs in local underpowered devices. This
// is ok since these are correctness tests; benchmarks track performance regressions separately.
const EXPECT_TIMEOUT_MS = 12000;

test.describe("Recipe Paste and Fill", () => {
  test("recipe paste should function correctly for all recipes without user-defined ingredients", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    await goToPageAndWaitFor(page);

    for (const recipeId of RECIPE_IDS_WITHOUT_USER_DEFINED)
      await pasteRecipeAndWaitForUpdate(page, browserName, recipeId, undefined, EXPECT_TIMEOUT_MS);
  });

  test("recipe fill should function correctly for all recipes without user-defined ingredients", async ({
    page,
  }) => {
    await goToPageAndWaitFor(page);

    for (const recipeId of RECIPE_IDS_WITHOUT_USER_DEFINED)
      await fillRecipeAndWaitForUpdate(page, recipeId, EXPECT_TIMEOUT_MS);
  });

  test("recipe paste should function correctly for all recipes with user-defined ingredients", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    await goToPageAndWaitFor(page);

    await loginAsTestUserWithCredentials(page, TEST_USER_B);

    for (const recipeId of RECIPE_IDS_WITH_USER_DEFINED)
      await pasteRecipeAndWaitForUpdate(page, browserName, recipeId, undefined, EXPECT_TIMEOUT_MS);
  });

  test("recipe fill should function correctly for recipes with user-defined ingredients", async ({
    page,
  }) => {
    await goToPageAndWaitFor(page);

    await loginAsTestUserWithCredentials(page, TEST_USER_B);

    for (const recipeId of RECIPE_IDS_WITH_USER_DEFINED)
      await fillRecipeAndWaitForUpdate(page, recipeId, EXPECT_TIMEOUT_MS);
  });
});
