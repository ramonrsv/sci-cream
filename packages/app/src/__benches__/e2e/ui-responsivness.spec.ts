import { test, expect } from "@playwright/test";

import { QtyToggle } from "@/lib/ui/qty-toggle-select";
import { KeyFilter } from "@/lib/ui/key-filter-select";
import { CompKey, comp_key_as_med_str, compToPropKey } from "@workspace/sci-cream";

import { RecipeID, getRecipeText, getLightRecipe } from "@/__tests__/assets";

import {
  getIngredientNameInputAtIdx,
  getIngredientQtyInputAtIdx,
  getRecipeGridRecipeSelector,
  getMixPropertiesQtyToggleSelectInput,
  getMixPropertyValueElement,
  getCompositionGridRecipeSelector,
  getCompositionGridQtyToggleSelectInput,
  getCompositionGridKeyFilterSelectInput,
  getCompositionValueElement,
  pasteToClipboard,
  getPasteButton,
  getRecipeUpdateCheckElements,
  getExpectedRecipeUpdateValues,
  expectRecipeElementsToHaveExpected,
  makeExpectedRecipeUpdates,
  pasteRecipeAndWaitForUpdate,
  PASTE_CHECK_DEFAULT_ING_IDX,
} from "@/__tests__/e2e/util";

import {
  allBenchmarkResultsForUpload,
  doBenchmarkTimeMeasurements as doBenchmarkTimeMeasurementsGeneric,
  formatTimeBenchmarkResultForUpload,
  timeExecution,
} from "@/__benches__/e2e/util";

const COUNT_TIME_RUNS = 10; // Number of runs for each execution time benchmark
const QTY_UPDATES_PER_LOOP = 50; // Number of times to update an ingredient's quantity per loop

function doBenchmarkTimeMeasurements(name: string, run: () => Promise<number>) {
  return doBenchmarkTimeMeasurementsGeneric(COUNT_TIME_RUNS, name, run).then((result) => {
    allBenchmarkResultsForUpload.push(formatTimeBenchmarkResultForUpload(result));
    return result;
  });
}

test.describe("UI Responsiveness Performance Benchmarks", () => {
  test.setTimeout(10 * 60 * 1000);

  test("should measure initial page load time", async ({ page }) => {
    await doBenchmarkTimeMeasurements("Initial page load", async () => {
      return timeExecution(async () => {
        await page.goto("");
        await page.waitForLoadState("networkidle");

        // @todo Temporary delay to test github-action-benchmark integration
        await page.waitForTimeout(2000);
      });
    });
  });

  test("should measure recipe ingredient input responsiveness", async ({ page }) => {
    await doBenchmarkTimeMeasurements("Ingredient name input", async () => {
      await page.goto("");
      await page.waitForLoadState("networkidle");

      const ingNameInput = getIngredientNameInputAtIdx(page, 0);

      return timeExecution(async () => {
        await ingNameInput.fill("2% Milk");
        await expect(ingNameInput).toHaveValue("2% Milk");
      });
    });
  });

  test("should measure composition grid ingredient input responsiveness", async ({ page }) => {
    await doBenchmarkTimeMeasurements("Ingredient name input to composition", async () => {
      await page.goto("");
      await page.waitForLoadState("networkidle");

      const compGridQtyToggle = getCompositionGridQtyToggleSelectInput(page);
      await compGridQtyToggle.selectOption(QtyToggle.Composition);

      const ingNameInput = getIngredientNameInputAtIdx(page, 0);
      const milkFatStr = comp_key_as_med_str(CompKey.MilkFat);

      return timeExecution(async () => {
        await ingNameInput.fill("2% Milk");
        await page.getByRole("columnheader", { name: milkFatStr }).waitFor();
        const milkFatCompValue = await getCompositionValueElement(page, 0, CompKey.MilkFat);
        await expect(milkFatCompValue).toHaveText("2");
      });
    });
  });

  test("should measure recipe quantity input responsiveness", async ({ page }) => {
    await doBenchmarkTimeMeasurements("Ingredient quantity input", async () => {
      await page.goto("");
      await page.waitForLoadState("networkidle");

      const ingQtyInput = getIngredientQtyInputAtIdx(page, 0);

      return timeExecution(async () => {
        await ingQtyInput.fill("100");
        await expect(ingQtyInput).toHaveValue("100");
      });
    });
  });

  test("should measure properties grid quantity input responsiveness", async ({ page }) => {
    await doBenchmarkTimeMeasurements("Ingredient quantity input to mix property", async () => {
      await page.goto("");
      await page.waitForLoadState("networkidle");

      const propsGridQtyToggle = getMixPropertiesQtyToggleSelectInput(page);
      await propsGridQtyToggle.selectOption(QtyToggle.Quantity);

      const ingNameInput = getIngredientNameInputAtIdx(page, 0);
      await ingNameInput.fill("2% Milk");
      await expect(ingNameInput).toHaveValue("2% Milk");

      const ingQtyInput = getIngredientQtyInputAtIdx(page, 0);
      const milkFatPropValue = getMixPropertyValueElement(page, compToPropKey(CompKey.MilkFat));

      return timeExecution(async () => {
        await ingQtyInput.fill("100");
        await expect(milkFatPropValue).toHaveText("2");
      });
    });
  });

  test("should measure recipe paste responsiveness", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    await doBenchmarkTimeMeasurements("Recipe paste", async () => {
      await page.goto("");
      await page.waitForLoadState("networkidle");

      const compGridKeyFilterSelect = getCompositionGridKeyFilterSelectInput(page);
      await compGridKeyFilterSelect.selectOption(KeyFilter.All);

      const elements = await getRecipeUpdateCheckElements(page, RecipeID.Main);
      const expected = getExpectedRecipeUpdateValues(getLightRecipe(RecipeID.Main));

      await pasteToClipboard(page, browserName, getRecipeText(RecipeID.Main));
      const pasteButton = getPasteButton(page);

      return timeExecution(async () => {
        await pasteButton.click();
        await expectRecipeElementsToHaveExpected(elements, expected);
      });
    });
  });

  test("should measure recipe switch responsiveness", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    await doBenchmarkTimeMeasurements("Recipe switch", async () => {
      await page.goto("");
      await page.waitForLoadState("networkidle");

      await pasteRecipeAndWaitForUpdate(page, browserName, RecipeID.Main);
      await pasteRecipeAndWaitForUpdate(page, browserName, RecipeID.RefA);

      const recipeGridRecipeSelect = getRecipeGridRecipeSelector(page);
      const compGridRecipeSelect = getCompositionGridRecipeSelector(page);

      const elements = await getRecipeUpdateCheckElements(page, RecipeID.Main);
      const expected = getExpectedRecipeUpdateValues(getLightRecipe(RecipeID.Main));

      return timeExecution(async () => {
        await compGridRecipeSelect.selectOption(RecipeID.Main);
        await recipeGridRecipeSelect.selectOption(RecipeID.Main);
        await expectRecipeElementsToHaveExpected(elements, expected);
      });
    });
  });

  const RECIPE_QTY_UPDATES_EXPECTED_VALUES = makeExpectedRecipeUpdates(
    QTY_UPDATES_PER_LOOP,
    getLightRecipe(RecipeID.Main),
    PASTE_CHECK_DEFAULT_ING_IDX,
  );

  test("should measure rapid ingredient quantity updates, waiting each update completion", async ({
    page,
    browserName,
  }) => {
    await doBenchmarkTimeMeasurements("Rapid ingredient quantity updates, each", async () => {
      await page.goto("");
      await page.waitForLoadState("networkidle");

      await pasteRecipeAndWaitForUpdate(page, browserName, RecipeID.Main);
      const elements = await getRecipeUpdateCheckElements(page, RecipeID.Main);

      return timeExecution(async () => {
        for (const expected of RECIPE_QTY_UPDATES_EXPECTED_VALUES) {
          await elements.ingQtyInput.fill(expected.ingQty);
          await expectRecipeElementsToHaveExpected(elements, expected);
        }
      }, RECIPE_QTY_UPDATES_EXPECTED_VALUES.length);
    });
  });

  test("should measure rapid ingredient quantity updates, checking final completion", async ({
    page,
    browserName,
  }) => {
    await doBenchmarkTimeMeasurements("Rapid ingredient quantity updates, final", async () => {
      await page.goto("");
      await page.waitForLoadState("networkidle");

      await pasteRecipeAndWaitForUpdate(page, browserName, RecipeID.Main);
      const elements = await getRecipeUpdateCheckElements(page, RecipeID.Main);

      const finalExpected =
        RECIPE_QTY_UPDATES_EXPECTED_VALUES[RECIPE_QTY_UPDATES_EXPECTED_VALUES.length - 1];

      return timeExecution(async () => {
        for (const expected of RECIPE_QTY_UPDATES_EXPECTED_VALUES)
          await elements.ingQtyInput.fill(expected.ingQty);

        await expectRecipeElementsToHaveExpected(elements, finalExpected);
      }, RECIPE_QTY_UPDATES_EXPECTED_VALUES.length);
    });
  });
});
