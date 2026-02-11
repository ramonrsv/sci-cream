import { test, expect } from "@playwright/test";

import {
  pasteToClipboard,
  getPasteButton,
  getClearButton,
  recipePasteCheckElements,
  recipeUpdateCompleted,
  getUsedJSHeapSizeInMB,
} from "@/__tests__/e2e/util";

import {
  THRESHOLDS,
  REF_RECIPE_TEXT,
  EXPECTED_FIRST_INGREDIENT,
  EXPECTED_MULTIPLE_UPDATES_FIRST_INGREDIENT,
} from "@/__tests__/assets";

// Number of times to loop an operation sequence for memory usage measurements
const COUNT_MEMORY_USAGE_OPERATION_LOOPS = 10;

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

  for (let i = 0; i < COUNT_MEMORY_USAGE_OPERATION_LOOPS; i++) {
    await pasteToClipboard(page, browserName, REF_RECIPE_TEXT);
    const pasteButton = getPasteButton(page);
    await pasteButton.click();

    const elements = await recipePasteCheckElements(page, 0);
    await recipeUpdateCompleted(page, elements, EXPECTED_FIRST_INGREDIENT);
    maxLoopUsage = Math.max(maxLoopUsage, await getUsedJSHeapSizeInMB(page, browserName));

    for (const expected of EXPECTED_MULTIPLE_UPDATES_FIRST_INGREDIENT) {
      await elements.ingQtyInput.fill(expected.qty.toString());
      await recipeUpdateCompleted(page, elements, expected);
      maxLoopUsage = Math.max(maxLoopUsage, await getUsedJSHeapSizeInMB(page, browserName));
    }

    const clearButton = getClearButton(page);
    await clearButton.click();
    await expect(elements.ingNameInput).toHaveValue("");
    await expect(elements.ingQtyInput).toHaveValue("");
    maxLoopUsage = Math.max(maxLoopUsage, await getUsedJSHeapSizeInMB(page, browserName));

    measurements.push(maxLoopUsage);
    maxLoopUsage = 0;
  }

  const baselineUsage = Math.max(...measurements.slice(0, 3));
  const finalUsage = measurements[measurements.length - 1];
  const percentIncrease = ((finalUsage - baselineUsage) / baselineUsage) * 100;

  expect(percentIncrease).toBeLessThan(THRESHOLDS.memory_usage_percent_increase);
});
