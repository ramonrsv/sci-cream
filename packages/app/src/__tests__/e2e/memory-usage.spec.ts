import { test, expect } from "@playwright/test";

import { RecipeID, THRESHOLDS } from "@/__tests__/assets";

import {
  getUsedJSHeapSizeInMB,
  makePerRecipeQtyUpdatesExpectedValues,
  pasteRecipeAndWaitForUpdate,
  clearRecipeAndWaitForUpdate,
  PASTE_CHECK_DEFAULT_ING_IDX,
  expectRecipeElementsToHaveExpected,
  configureComponentsForRecipeUpdateCheck,
  getRecipeUpdateCheckElements,
} from "@/__tests__/e2e/util";

const COUNT_OPERATION_LOOPS = 5; // Number of times to loop an operation sequence for memory usage
const COUNT_QTY_UPDATES_PER_LOOP = 30; // Number of times to update ingredient quantity per loop

const RECIPE_IDS_TO_TEST = [RecipeID.Main, RecipeID.RefA, RecipeID.RefB];

const PER_RECIPE_QTY_UPDATES_EXPECTED_VALUES = makePerRecipeQtyUpdatesExpectedValues(
  COUNT_QTY_UPDATES_PER_LOOP,
  RECIPE_IDS_TO_TEST,
  PASTE_CHECK_DEFAULT_ING_IDX,
);

test("should measure peak memory usage and detect leaks", async ({ page, browserName }) => {
  test.skip(
    browserName !== "chromium",
    "Memory usage measurement is only supported in Chromium-based browsers",
  );

  test.setTimeout(5 * 60 * 1000);

  await page.goto("");
  await page.waitForLoadState("networkidle");

  const measurements: number[] = [];

  let maxLoopUsage = 0;

  const refreshMaxLoopUsage = async () => {
    maxLoopUsage = Math.max(maxLoopUsage, await getUsedJSHeapSizeInMB(page, browserName));
  };

  for (let i = 0; i < COUNT_OPERATION_LOOPS; i++) {
    await refreshMaxLoopUsage();

    for (const recipeId of RECIPE_IDS_TO_TEST) {
      await pasteRecipeAndWaitForUpdate(page, browserName, recipeId);
      await refreshMaxLoopUsage();
    }

    for (const recipeId of RECIPE_IDS_TO_TEST) {
      await configureComponentsForRecipeUpdateCheck(page, recipeId);

      for (const expected of PER_RECIPE_QTY_UPDATES_EXPECTED_VALUES.get(recipeId)!) {
        const elements = await getRecipeUpdateCheckElements(page, recipeId, expected.ingIdx);

        elements.ingQtyInput.fill(expected.ingQty);
        await expectRecipeElementsToHaveExpected(elements, expected);

        await refreshMaxLoopUsage();
      }
    }

    for (const recipeId of RECIPE_IDS_TO_TEST) {
      await clearRecipeAndWaitForUpdate(page, recipeId);
      await refreshMaxLoopUsage();
    }

    measurements.push(maxLoopUsage);
    maxLoopUsage = 0;
  }

  const baselineUsage = Math.max(...measurements.slice(0, 3));
  const finalUsage = measurements[measurements.length - 1];
  const percentIncrease = ((finalUsage - baselineUsage) / baselineUsage) * 100;

  expect(percentIncrease).toBeLessThan(THRESHOLDS.memory_usage_percent_increase);
});
