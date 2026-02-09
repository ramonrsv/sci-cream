import { test, expect } from "@playwright/test";

import {
  allBenchmarkResultsForUpload,
  doBenchmarkMemoryMeasurements as doBenchmarkMemoryMeasurementsGeneric,
  formatMemoryBenchmarkResultForUpload,
  pasteToClipboard,
  getPasteButton,
  getClearButton,
  recipePasteCheckElements,
  recipeUpdateCompleted,
  getUsedJSHeapSizeInMB,
} from "@/__tests__/util";

import {
  REF_RECIPE_TEXT,
  EXPECTED_MULTIPLE_UPDATES_FIRST_INGREDIENT,
  EXPECTED_FIRST_INGREDIENT,
} from "@/__tests__/assets";

// Number of runs for each memory usage benchmark
const COUNT_MEMORY_RUNS = 5;

// Number of times to loop an operation sequence
const COUNT_OPERATION_LOOPS = 5;

function doBenchmarkMemoryMeasurements(name: string, run: () => Promise<number>) {
  return doBenchmarkMemoryMeasurementsGeneric(COUNT_MEMORY_RUNS, name, run).then((result) => {
    allBenchmarkResultsForUpload.push(formatMemoryBenchmarkResultForUpload(result));
    return result;
  });
}

test("should measure peak memory usage during typical operations", async ({
  page,
  browserName,
}) => {
  test.setTimeout(5 * 60 * 1000);

  await doBenchmarkMemoryMeasurements("Peak memory usage during typical ops", async () => {
    await page.goto("");
    await page.waitForLoadState("networkidle");

    let maxUsage = 0;

    for (let i = 0; i < COUNT_OPERATION_LOOPS; i++) {
      await pasteToClipboard(page, browserName, REF_RECIPE_TEXT);
      const pasteButton = getPasteButton(page);
      await pasteButton.click();

      const elements = await recipePasteCheckElements(page, 0);
      await recipeUpdateCompleted(page, elements, EXPECTED_FIRST_INGREDIENT);
      maxUsage = Math.max(maxUsage, await getUsedJSHeapSizeInMB(page, browserName));

      for (const expected of EXPECTED_MULTIPLE_UPDATES_FIRST_INGREDIENT) {
        await elements.ingQtyInput.fill(expected.qty.toString());
        await recipeUpdateCompleted(page, elements, expected);
        maxUsage = Math.max(maxUsage, await getUsedJSHeapSizeInMB(page, browserName));
      }

      const clearButton = getClearButton(page);
      await clearButton.click();
      await expect(elements.ingNameInput).toHaveValue("");
      await expect(elements.ingQtyInput).toHaveValue("");
      maxUsage = Math.max(maxUsage, await getUsedJSHeapSizeInMB(page, browserName));
    }

    return maxUsage;
  });
});
