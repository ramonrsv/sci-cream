import { test, expect } from "@playwright/test";

import { CompKey, compToPropKey } from "@workspace/sci-cream";

import { getAcceptablePropertyRange } from "@/lib/sci-cream/sci-cream";

import { pasteRecipeAndWaitForUpdate, goToPageAndWaitFor } from "@/__tests__/e2e/util";

import { RecipeID } from "@/__tests__/assets";

import { presetWatcherSelection } from "./util";

/**
 * `PropKey`s used to exercise the with-range and no-range code paths in `WatcherCard` close-ups.
 *
 * These are intentionally chosen for their `getAcceptablePropertyRange` behavior, not for what
 * they represent. If `getAcceptablePropertyRange`'s definitions change in the future, the
 * invariant check below will fail loudly so the test choices can be updated.
 */
const KEY_WITH_RANGE = compToPropKey(CompKey.MSNF);
const KEY_WITHOUT_RANGE = compToPropKey(CompKey.MilkFat);

test.describe("Visual Regression: WatcherCard", () => {
  test("KEY_WITH_RANGE and KEY_WITHOUT_RANGE match the current range definitions", () => {
    expect(getAcceptablePropertyRange(KEY_WITH_RANGE)).toBeDefined();
    expect(getAcceptablePropertyRange(KEY_WITHOUT_RANGE)).toBeUndefined();
  });

  test("WatcherCard - with range, empty", async ({ page }) => {
    await presetWatcherSelection(page, [String(KEY_WITH_RANGE)]);
    await goToPageAndWaitFor(page);

    const card = page.locator(`[data-testid="watcher-card-${KEY_WITH_RANGE}"]`);
    await expect(card).toBeVisible();
    await expect(card).toHaveScreenshot("watcher-card-with-range-empty.png");
  });

  test("WatcherCard - with range, populated with main + refs", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    await presetWatcherSelection(page, [String(KEY_WITH_RANGE)]);
    await goToPageAndWaitFor(page);

    for (const recipeId of [RecipeID.Main, RecipeID.RefA, RecipeID.RefB]) {
      await pasteRecipeAndWaitForUpdate(page, browserName, recipeId);
    }

    const card = page.locator(`[data-testid="watcher-card-${KEY_WITH_RANGE}"]`);
    await expect(card).toBeVisible();
    await expect(card).toHaveScreenshot("watcher-card-with-range-populated.png");
  });

  test("WatcherCard - no range, empty", async ({ page }) => {
    await presetWatcherSelection(page, [String(KEY_WITHOUT_RANGE)]);
    await goToPageAndWaitFor(page);

    const card = page.locator(`[data-testid="watcher-card-${KEY_WITHOUT_RANGE}"]`);
    await expect(card).toBeVisible();
    await expect(card).toHaveScreenshot("watcher-card-no-range-empty.png");
  });

  test("WatcherCard - no range, populated with main + refs", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    await presetWatcherSelection(page, [String(KEY_WITHOUT_RANGE)]);
    await goToPageAndWaitFor(page);

    for (const recipeId of [RecipeID.Main, RecipeID.RefA, RecipeID.RefB]) {
      await pasteRecipeAndWaitForUpdate(page, browserName, recipeId);
    }

    const card = page.locator(`[data-testid="watcher-card-${KEY_WITHOUT_RANGE}"]`);
    await expect(card).toBeVisible();
    await expect(card).toHaveScreenshot("watcher-card-no-range-populated.png");
  });
});
