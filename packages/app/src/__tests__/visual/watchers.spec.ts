import { test, expect, Page } from "@playwright/test";

import { CompKey, compToPropKey, getMixProperty, PropKey } from "@workspace/sci-cream";
import { getAcceptablePropertyRange } from "@/lib/sci-cream/sci-cream";
import { KeyFilter } from "@/app/_elements/selects/key-filter-select";

import { goToPageAndWaitFor, goToPageAndPasteRecipes } from "@/__tests__/e2e/util";
import { makeRecipesTestName, makeRecipesScreenshotFilename } from "@/__tests__/visual/assets";
import { RecipeID, getLightRecipe } from "@/__tests__/assets";
import { WASM_BRIDGE } from "@/__tests__/util";

import { STORAGE_KEYS } from "@/lib/local-storage";

/**
 * Inject a watcher-selection list into `localStorage` before navigation, so that `WatchersView`'s
 * mount-time hydration picks it up. Use to control which cards appear in screenshot tests.
 */
export async function presetWatcherSelection(page: Page, propKeys: PropKey[]) {
  await page.addInitScript(
    ([key, keys]) => {
      localStorage.setItem(key, JSON.stringify(keys.map(String)));
    },
    [STORAGE_KEYS.watcherSelectedProps, propKeys] as const,
  );
}

/** Select `KeyFilter.Custom` to make the watcher-selection in `localStorage` visible */
async function selectKeyFilterCustom(page: Page) {
  await page
    .locator("#watchers-panel #key-filter-select select")
    .first()
    .selectOption(KeyFilter.Custom);
}

/** Locate a watcher card by its `PropKey` and assert that it is visible. */
async function locateWatcherCardByKeyAndExpectVisible(page: Page, propKey: PropKey) {
  const card = page.locator(`[data-testid="watcher-card-${propKey}"]`);
  await expect(card).toBeVisible();
  return card;
}

/** Locate the `WatchersView` and assert that it is visible. */
async function locateWatchersViewAndExpectVisible(page: Page) {
  const view = page.locator("#watchers-panel");
  await expect(view).toBeVisible();
  return view;
}

/**
 * `PropKey`s used to exercise the various code paths in `WatcherCard` close-ups, e.g. with and
 * without range, with and without reference values, etc.
 *
 * These are intentionally chosen for their specific behavior, e.g. `getAcceptablePropertyRange`,
 * whether the reference recipe(s) have a non-zero value for it, etc., not for what they represent.
 * If definitions change in the future that alter those behaviors, then the invariant check below
 * will fail loudly so the test choices can be updated.
 */
const KEY_WITH_RANGE = compToPropKey(CompKey.MSNF);
const KEY_WITHOUT_RANGE = compToPropKey(CompKey.MilkFat);
const KEY_MIXED_REF_VALS = compToPropKey(CompKey.ABV);

test("KEY_WITH_RANGE and KEY_WITHOUT_RANGE match the current range definitions", () => {
  expect(getAcceptablePropertyRange(KEY_WITH_RANGE)).toBeDefined();
  expect(getAcceptablePropertyRange(KEY_WITHOUT_RANGE)).toBeUndefined();
});

test("KEY_MIXED_REF_VALS has a value for Ref B but not Ref A recipes", () => {
  const refAProps = WASM_BRIDGE.calculate_recipe_mix_properties(getLightRecipe(RecipeID.RefA));
  const refBProps = WASM_BRIDGE.calculate_recipe_mix_properties(getLightRecipe(RecipeID.RefB));
  expect(getMixProperty(refAProps, KEY_MIXED_REF_VALS)).toBe(0);
  expect(getMixProperty(refBProps, KEY_MIXED_REF_VALS)).toBeGreaterThan(0);
});

test.describe("Visual Regression: WatcherCard, Empty State", () => {
  test("with range, empty", async ({ page }) => {
    await presetWatcherSelection(page, [KEY_WITH_RANGE]);

    await goToPageAndWaitFor(page);
    await selectKeyFilterCustom(page);

    const card = await locateWatcherCardByKeyAndExpectVisible(page, KEY_WITH_RANGE);
    await expect(card).toHaveScreenshot("watcher-card-with-range-empty.png");
  });

  test("no range, empty", async ({ page }) => {
    await presetWatcherSelection(page, [KEY_WITHOUT_RANGE]);

    await goToPageAndWaitFor(page);
    await selectKeyFilterCustom(page);

    const card = await locateWatcherCardByKeyAndExpectVisible(page, KEY_WITHOUT_RANGE);
    await expect(card).toHaveScreenshot("watcher-card-no-range-empty.png");
  });
});

test.describe("Visual Regression: WatcherCard, Main and Reference Recipes Populated", () => {
  const testWatcherCard = (prefix: string, propKey: PropKey, recipeIds: RecipeID[]) => {
    test(makeRecipesTestName(prefix, recipeIds), async ({ page, browserName }) => {
      test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");
      await presetWatcherSelection(page, [propKey]);

      await goToPageAndPasteRecipes(page, browserName, recipeIds);
      await selectKeyFilterCustom(page);

      const card = await locateWatcherCardByKeyAndExpectVisible(page, propKey);
      await expect(card).toHaveScreenshot(
        makeRecipesScreenshotFilename(`watcher-card-${prefix}`, recipeIds),
      );
    });
  };

  const testCases: [string, PropKey][] = [
    ["with range", KEY_WITH_RANGE],
    ["no range", KEY_WITHOUT_RANGE],
    ["mixed ref vals", KEY_MIXED_REF_VALS],
  ];

  for (const [prefix, propKey] of testCases) {
    testWatcherCard(prefix, propKey, [RecipeID.Main]);
    testWatcherCard(prefix, propKey, [RecipeID.Main, RecipeID.RefA]);
    testWatcherCard(prefix, propKey, [RecipeID.Main, RecipeID.RefB]);
    testWatcherCard(prefix, propKey, [RecipeID.Main, RecipeID.RefA, RecipeID.RefB]);
    testWatcherCard(prefix, propKey, [RecipeID.RefA]);
    testWatcherCard(prefix, propKey, [RecipeID.RefB]);
    testWatcherCard(prefix, propKey, [RecipeID.RefA, RecipeID.RefB]);
  }
});

test.describe("Visual Regression: WatchersView", () => {
  const testWatchersView = (recipeIds: RecipeID[]) => {
    test(makeRecipesTestName("WatchersView", recipeIds), async ({ page, browserName }) => {
      test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");
      await presetWatcherSelection(page, [KEY_WITH_RANGE, KEY_WITHOUT_RANGE, KEY_MIXED_REF_VALS]);

      await goToPageAndPasteRecipes(page, browserName, recipeIds);
      await selectKeyFilterCustom(page);

      const card = await locateWatchersViewAndExpectVisible(page);
      await expect(card).toHaveScreenshot(
        makeRecipesScreenshotFilename("watchers-view", recipeIds),
      );
    });
  };

  testWatchersView([RecipeID.Main]);
  testWatchersView([RecipeID.Main, RecipeID.RefA]);
  testWatchersView([RecipeID.Main, RecipeID.RefB]);
  testWatchersView([RecipeID.Main, RecipeID.RefA, RecipeID.RefB]);
  testWatchersView([RecipeID.RefA]);
  testWatchersView([RecipeID.RefB]);
  testWatchersView([RecipeID.RefA, RecipeID.RefB]);
});
