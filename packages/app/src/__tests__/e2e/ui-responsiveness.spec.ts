import { test, expect } from "@playwright/test";

import {
  timeExecution,
  getIngredientNameInputAtIdx,
  getIngredientQtyInputAtIdx,
  getMixPropertiesQtyToggleInput,
  getMixPropertyValueElement,
  getCompositionGridQtyToggleInput,
  getCompositionValueElement,
  pasteToClipboard,
  getPasteButton,
  recipePasteCheckElements,
  recipeUpdateCompleted,
  getRecipeGridRecipeSelector,
  getCompositionGridRecipeSelector,
} from "@/__tests__/util";

import {
  THRESHOLDS,
  REF_RECIPE_TEXT,
  LAST_INGREDIENT_IDX,
  EXPECTED_LAST_INGREDIENT,
} from "@/__tests__/assets";

import { QtyToggle } from "@/lib/ui/key-selection";
import { CompKey, comp_key_as_med_str, compToPropKey } from "@workspace/sci-cream";

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

    const compGridQtyToggle = getCompositionGridQtyToggleInput(page);
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

    const propsGridQtyToggle = getMixPropertiesQtyToggleInput(page);
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

    await pasteToClipboard(page, browserName, REF_RECIPE_TEXT);
    const pasteButton = getPasteButton(page);

    const elements = await recipePasteCheckElements(page, LAST_INGREDIENT_IDX);

    const exec_time = await timeExecution(async () => {
      await pasteButton.click();
      await recipeUpdateCompleted(page, elements, EXPECTED_LAST_INGREDIENT);
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

    await pasteToClipboard(page, browserName, REF_RECIPE_TEXT);
    const pasteButton = getPasteButton(page);

    const expected = EXPECTED_LAST_INGREDIENT;

    const recipeGridRecipeSelector = getRecipeGridRecipeSelector(page);
    const compGridRecipeSelector = getCompositionGridRecipeSelector(page);

    const pasteStart = Date.now();
    for (const recipeIdx of [0, 1, 2]) {
      await recipeGridRecipeSelector.selectOption(recipeIdx.toString());
      await pasteButton.click();

      const elements = await recipePasteCheckElements(page, LAST_INGREDIENT_IDX);
      await expect(elements.ingNameInput).toHaveValue(expected.name);
      await expect(elements.ingQtyInput).toHaveValue(expected.qty.toString());
      await expect(elements.propServingTemp).toBeVisible();
      await expect(elements.propServingTemp).not.toHaveText(expected.servingTemp);
    }
    const pasteEnd = Date.now();

    for (const recipeIdx of [0, 1, 2]) {
      await recipeGridRecipeSelector.selectOption(recipeIdx.toString());
      await compGridRecipeSelector.selectOption(recipeIdx.toString());

      const elements = await recipePasteCheckElements(page, LAST_INGREDIENT_IDX);
      await recipeUpdateCompleted(page, elements, expected);
    }
    const updateEnd = Date.now();

    const pasteTime = pasteEnd - pasteStart;
    const updateTime = updateEnd - gotoStart;

    expect(pasteTime).toBeLessThan(THRESHOLDS.paste_response);
    expect(updateTime).toBeGreaterThan(2000);
  });
});
