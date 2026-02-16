import { test, expect } from "@playwright/test";

import { QtyToggle } from "@/lib/ui/qty-toggle-select";
import { KeyFilter } from "@/lib/ui/key-filter-select";
import { CompKey, comp_key_as_med_str, compToPropKey } from "@workspace/sci-cream";

import { THRESHOLDS, RecipeID, getRecipeText, getLightRecipe } from "@/__tests__/assets";

import {
  getIngredientNameInputAtIdx,
  getIngredientQtyInputAtIdx,
  getMixPropertiesQtyToggleSelectInput,
  getMixPropertyValueElement,
  getCompositionGridQtyToggleSelectInput,
  getCompositionValueElement,
  pasteToClipboard,
  getPasteButton,
  getRecipeUpdateCheckElements,
  getRecipeGridRecipeSelector,
  getCompositionGridRecipeSelector,
  getExpectedRecipeUpdateValues,
  expectRecipeElementsToHaveExpected,
  configureComponentsForRecipeUpdateCheck,
  getCompositionGridKeyFilterSelectInput,
} from "@/__tests__/e2e/util";

import { timeExecution } from "@/__benches__/e2e/util";

import { sleep_ms } from "@/lib/util";

test.describe("UI Responsiveness Performance Checks", () => {
  test("should measure initial page load time", async ({ page }) => {
    const exec_time = await timeExecution(async () => {
      await page.goto("");
      await page.waitForLoadState("networkidle");
    });

    expect(exec_time).toBeLessThan(THRESHOLDS.page_load);
  });

  test("should measure recipe ingredient input responsiveness", async ({ page }) => {
    await page.goto("");
    await page.waitForLoadState("networkidle");

    const ingNameInput = getIngredientNameInputAtIdx(page, 0);

    const exec_time = await timeExecution(async () => {
      await ingNameInput.fill("2% Milk");
      await expect(ingNameInput).toBeVisible();
      await expect(ingNameInput).toHaveValue("2% Milk");
    });

    expect(exec_time).toBeLessThan(THRESHOLDS.input_response);
  });

  test("should measure composition grid ingredient input responsiveness", async ({ page }) => {
    await page.goto("");
    await page.waitForLoadState("networkidle");

    const compGridQtyToggle = getCompositionGridQtyToggleSelectInput(page);
    await compGridQtyToggle.selectOption(QtyToggle.Composition);

    const ingNameInput = getIngredientNameInputAtIdx(page, 0);
    const milkFatStr = comp_key_as_med_str(CompKey.MilkFat);

    const exec_time = await timeExecution(async () => {
      await ingNameInput.fill("2% Milk");
      await page.getByRole("columnheader", { name: milkFatStr }).waitFor();
      const milkFatCompValue = await getCompositionValueElement(page, 0, CompKey.MilkFat);
      await expect(milkFatCompValue).toBeVisible();
      await expect(milkFatCompValue).toHaveText("2");
    });

    expect(exec_time).toBeLessThan(THRESHOLDS.input_response);
  });

  test("should measure recipe quantity input responsiveness", async ({ page }) => {
    await page.goto("");
    await page.waitForLoadState("networkidle");

    const ingQtyInput = getIngredientQtyInputAtIdx(page, 0);

    const exec_time = await timeExecution(async () => {
      await ingQtyInput.fill("100");
      await expect(ingQtyInput).toBeVisible();
      await expect(ingQtyInput).toHaveValue("100");
    });

    expect(exec_time).toBeLessThan(THRESHOLDS.input_response);
  });

  test("should measure properties grid quantity input responsiveness", async ({ page }) => {
    await page.goto("");
    await page.waitForLoadState("networkidle");

    const propsGridQtyToggle = getMixPropertiesQtyToggleSelectInput(page);
    await propsGridQtyToggle.selectOption(QtyToggle.Quantity);

    const ingNameInput = getIngredientNameInputAtIdx(page, 0);
    await ingNameInput.fill("2% Milk");
    await expect(ingNameInput).toBeVisible();
    await expect(ingNameInput).toHaveValue("2% Milk");

    const ingQtyInput = getIngredientQtyInputAtIdx(page, 0);
    const milkFatPropValue = getMixPropertyValueElement(page, compToPropKey(CompKey.MilkFat));

    const exec_time = await timeExecution(async () => {
      await ingQtyInput.fill("100");
      await expect(milkFatPropValue).toBeVisible();
      await expect(milkFatPropValue).toHaveText("2");
    });

    expect(exec_time).toBeLessThan(THRESHOLDS.input_response);
  });

  test("should measure recipe paste responsiveness", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    await page.goto("");
    await page.waitForLoadState("networkidle");

    await pasteToClipboard(page, browserName, getRecipeText(RecipeID.Main));
    const pasteButton = getPasteButton(page);

    await configureComponentsForRecipeUpdateCheck(page, RecipeID.Main);
    const expected = getExpectedRecipeUpdateValues(getLightRecipe(RecipeID.Main));
    const elements = await getRecipeUpdateCheckElements(page, RecipeID.Main);

    const exec_time = await timeExecution(async () => {
      await pasteButton.click();
      await expectRecipeElementsToHaveExpected(elements, expected);
    });

    expect(exec_time).toBeLessThan(THRESHOLDS.paste_response);
  });

  // Simulates a slow initial load to ensure that recipe paste remains responsive and that the UI
  // updates correctly once the data is available. It should fail if the `useEffect` in `RecipeGrid`
  // to "Prevent stale ingredient rows if pasted quickly whilst... still loading..." is removed.
  test("recipe paste should be resilient to slow initial load", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    // Simulate slow fetch API responses
    await page.route("**/*", async (route) => {
      const method = route.request().method();
      const headers = route.request().headers();

      if (method === "POST" && headers["next-action"]) {
        await sleep_ms(2000);
      }

      await route.continue();
    });

    const gotoStart = Date.now();
    await page.goto("");
    await page.waitForLoadState("domcontentloaded");

    const pasteButton = getPasteButton(page);

    const recipeGridRecipeSelector = getRecipeGridRecipeSelector(page);
    const compGridRecipeSelector = getCompositionGridRecipeSelector(page);
    const compGridKeyFilterSelect = getCompositionGridKeyFilterSelectInput(page);

    await compGridKeyFilterSelect.selectOption(KeyFilter.All);

    const pasteStart = Date.now();
    for (const recipeId of [RecipeID.Main, RecipeID.RefA, RecipeID.RefB]) {
      await pasteToClipboard(page, browserName, getRecipeText(recipeId));
      await recipeGridRecipeSelector.selectOption(recipeId);
      await pasteButton.click();

      const expected = getExpectedRecipeUpdateValues(getLightRecipe(recipeId));
      const elements = await getRecipeUpdateCheckElements(page, recipeId);
      await expect(elements.ingNameInput).toHaveValue(expected.ingName);
      await expect(elements.ingQtyInput).toHaveValue(expected.ingQty);
      await expect(elements.propServingTemp).toBeVisible();
      await expect(elements.propServingTemp).not.toHaveText(expected.servingTemp);
    }
    const pasteEnd = Date.now();

    for (const recipeId of [RecipeID.Main, RecipeID.RefA, RecipeID.RefB]) {
      await recipeGridRecipeSelector.selectOption(recipeId);
      await compGridRecipeSelector.selectOption(recipeId);

      const elements = await getRecipeUpdateCheckElements(page, recipeId);
      const expected = getExpectedRecipeUpdateValues(getLightRecipe(recipeId));
      await expectRecipeElementsToHaveExpected(elements, expected);
    }
    const updateEnd = Date.now();

    const pasteTime = pasteEnd - pasteStart;
    const updateTime = updateEnd - gotoStart;

    // *2 to allow for additional overhead verifying paste of multiple recipes
    expect(pasteTime).toBeLessThan(THRESHOLDS.paste_response * 2);
    expect(updateTime).toBeGreaterThan(2000);
  });
});
