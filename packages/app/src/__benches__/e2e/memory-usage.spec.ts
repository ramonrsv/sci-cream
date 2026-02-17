import { test } from "@playwright/test";

import { RecipeID } from "@/__tests__/assets";

import {
  getUsedJSHeapSizeInMB,
  getRecipeUpdateCheckElements,
  configureComponentsForRecipeUpdateCheck,
  expectRecipeElementsToHaveExpected,
  makePerRecipeQtyUpdatesExpectedValues,
  pasteRecipeAndWaitForUpdate,
  clearRecipeAndWaitForUpdate,
  PASTE_CHECK_DEFAULT_ING_IDX,
} from "@/__tests__/e2e/util";

import {
  allBenchmarkResultsForUpload,
  doBenchmarkMemoryMeasurements as doBenchmarkMemoryMeasurementsGeneric,
  formatMemoryBenchmarkResultForUpload,
} from "@/__benches__/e2e/util";

const COUNT_MEMORY_RUNS = 2; // Number of runs for each memory usage benchmark
const COUNT_OPERATION_LOOPS = 5; // Number of times to loop an operation sequence
const COUNT_QTY_UPDATES_PER_LOOP = 30; // Number of times to update ingredient quantity per loop

const RECIPE_IDS_TO_TEST = [RecipeID.Main, RecipeID.RefA, RecipeID.RefB];

const PER_RECIPE_QTY_UPDATES_EXPECTED_VALUES = makePerRecipeQtyUpdatesExpectedValues(
  COUNT_QTY_UPDATES_PER_LOOP,
  RECIPE_IDS_TO_TEST,
  PASTE_CHECK_DEFAULT_ING_IDX,
);

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

    const refreshMaxUsage = async () => {
      maxUsage = Math.max(maxUsage, await getUsedJSHeapSizeInMB(page, browserName));
    };

    for (let i = 0; i < COUNT_OPERATION_LOOPS; i++) {
      await refreshMaxUsage();

      for (const recipeId of RECIPE_IDS_TO_TEST) {
        await pasteRecipeAndWaitForUpdate(page, browserName, recipeId);
        await refreshMaxUsage();
      }

      for (const recipeId of RECIPE_IDS_TO_TEST) {
        await configureComponentsForRecipeUpdateCheck(page, recipeId);

        for (const expected of PER_RECIPE_QTY_UPDATES_EXPECTED_VALUES.get(recipeId)!) {
          const elements = await getRecipeUpdateCheckElements(page, recipeId, expected.ingIdx);

          await elements.ingQtyInput.fill(expected.ingQty);
          await expectRecipeElementsToHaveExpected(elements, expected);

          await refreshMaxUsage();
        }
      }

      for (const recipeId of RECIPE_IDS_TO_TEST) {
        await clearRecipeAndWaitForUpdate(page, recipeId);
        await refreshMaxUsage();
      }
    }

    return maxUsage;
  });
});
