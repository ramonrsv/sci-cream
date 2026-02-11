import { test, expect } from "@playwright/test";

import {
  allBenchmarkResultsForUpload,
  doBenchmarkTimeMeasurements as doBenchmarkTimeMeasurementsGeneric,
  formatTimeBenchmarkResultForUpload,
  timeExecution,
  getIngredientNameInputAtIdx,
  getIngredientQtyInputAtIdx,
  getMixPropertiesQtyToggleInput,
  getMixPropertyValueElement,
  getCompositionGridQtyToggleInput,
  getCompositionValueElement,
  pasteToClipboard,
  getPasteButton,
  getRecipeSelector,
  recipePasteCheckElements,
  recipeUpdateCompleted,
} from "@/__tests__/util";

import {
  REF_RECIPE_TEXT,
  LAST_INGREDIENT_IDX,
  EXPECTED_MULTIPLE_UPDATES_FIRST_INGREDIENT,
  LAST_UPDATE_IDX,
  EXPECTED_FIRST_INGREDIENT,
  EXPECTED_LAST_INGREDIENT,
} from "@/__tests__/assets";

import { QtyToggle } from "@/lib/ui/qty-toggle-select";
import { CompKey, comp_key_as_med_str, compToPropKey } from "@workspace/sci-cream";

// Number of runs for each execution time benchmark
const COUNT_TIME_RUNS = 10;

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

      const compGridQtyToggle = getCompositionGridQtyToggleInput(page);
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

      const propsGridQtyToggle = getMixPropertiesQtyToggleInput(page);
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

      await pasteToClipboard(page, browserName, REF_RECIPE_TEXT);
      const pasteButton = getPasteButton(page);

      const elements = await recipePasteCheckElements(page, LAST_INGREDIENT_IDX);

      return timeExecution(async () => {
        await pasteButton.click();
        await recipeUpdateCompleted(page, elements, EXPECTED_LAST_INGREDIENT);
      });
    });
  });

  test("should measure recipe switch responsiveness", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    await doBenchmarkTimeMeasurements("Recipe switch", async () => {
      await page.goto("");
      await page.waitForLoadState("networkidle");

      await pasteToClipboard(page, browserName, REF_RECIPE_TEXT);
      const pasteButton = getPasteButton(page);
      await pasteButton.click();

      const elements = await recipePasteCheckElements(page, LAST_INGREDIENT_IDX);
      await recipeUpdateCompleted(page, elements, EXPECTED_LAST_INGREDIENT);

      const recipeSelector = getRecipeSelector(page);
      await expect(recipeSelector).toBeEnabled();

      return timeExecution(async () => {
        await recipeSelector.selectOption({ value: "1" });
        await expect(elements.ingNameInput).toHaveValue("");
        await expect(elements.ingQtyInput).toHaveValue("");

        await recipeSelector.selectOption({ value: "0" });
        await recipeUpdateCompleted(page, elements, EXPECTED_LAST_INGREDIENT);
      });
    });
  });

  test("should measure rapid ingredient quantity updates, waiting each update completion", async ({
    page,
    browserName,
  }) => {
    await doBenchmarkTimeMeasurements("Rapid ingredient quantity updates, each", async () => {
      await page.goto("");
      await page.waitForLoadState("networkidle");

      await pasteToClipboard(page, browserName, REF_RECIPE_TEXT);
      const pasteButton = getPasteButton(page);
      await pasteButton.click();

      const elements = await recipePasteCheckElements(page, 0);
      await recipeUpdateCompleted(page, elements, EXPECTED_FIRST_INGREDIENT);

      return timeExecution(async () => {
        for (const expected of EXPECTED_MULTIPLE_UPDATES_FIRST_INGREDIENT) {
          await elements.ingQtyInput.fill(expected.qty.toString());
          await recipeUpdateCompleted(page, elements, expected);
        }
      }, EXPECTED_MULTIPLE_UPDATES_FIRST_INGREDIENT.length);
    });
  });

  test("should measure rapid ingredient quantity updates, checking final completion", async ({
    page,
    browserName,
  }) => {
    await doBenchmarkTimeMeasurements("Rapid ingredient quantity updates, final", async () => {
      await page.goto("");
      await page.waitForLoadState("networkidle");

      await pasteToClipboard(page, browserName, REF_RECIPE_TEXT);
      const pasteButton = getPasteButton(page);
      await pasteButton.click();

      const elements = await recipePasteCheckElements(page, 0);
      await recipeUpdateCompleted(page, elements, EXPECTED_FIRST_INGREDIENT);

      return timeExecution(async () => {
        for (const expected of EXPECTED_MULTIPLE_UPDATES_FIRST_INGREDIENT) {
          await elements.ingQtyInput.fill(expected.qty.toString());
        }

        const finalExpected = EXPECTED_MULTIPLE_UPDATES_FIRST_INGREDIENT[LAST_UPDATE_IDX];
        await recipeUpdateCompleted(page, elements, finalExpected);
      }, EXPECTED_MULTIPLE_UPDATES_FIRST_INGREDIENT.length);
    });
  });
});
