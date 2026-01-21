import { test, expect } from "@playwright/test";

import {
  timeExecution,
  getIngredientNameInputAtIdx,
  getIngredientQtyInputAtIdx,
  getMixPropertiesQtyToggleInput,
  getMixPropertyValueElement,
  getCompositionGridQtyToggleInput,
  getCompositionGridHeaders,
  getCompositionValueElement,
  pastToClipboard,
  getPasteButton,
} from "@/__tests__/util";

import { REFERENCE_RECIPE_TEXT } from "@/__tests__/assets";

import { QtyToggle } from "@/lib/ui/key-selection";
import {
  CompKey,
  comp_key_as_med_str,
  FpdKey,
  compToPropKey,
  fpdToPropKey,
} from "@workspace/sci-cream";

import { Metric } from "@/lib/web-vitals";

declare global {
  interface Window {
    __webVitals: Record<string, Metric>;
  }
}

test("has 'Ice Cream Recipe Calculator' heading", async ({ page }) => {
  await page.goto("");
  await expect(page.getByRole("heading", { name: "Ice Cream Recipe Calculator" })).toBeVisible();
});

test("should collect web vitals metrics and be good", async ({ page }) => {
  await page.goto("");

  await page.waitForLoadState("networkidle");
  await page.waitForLoadState("load");

  // Interact with page to trigger INP/FID
  await page.getByRole("heading", { name: "Ice Cream Recipe Calculator" }).click();
  await page.waitForTimeout(1000);

  const webVitals = await page.evaluate(() => window.__webVitals || {});

  expect(Object.keys(webVitals).length).toBeGreaterThan(0);

  for (const metric of Object.values(webVitals)) {
    expect(metric).toHaveProperty("value");
    expect(metric).toHaveProperty("rating");
    expect(metric.rating).toEqual("good");
  }
});

const THRESHOLDS = { page_load: 3000, input_response: 250 * 2, paste_response: 500 * 2 };

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
    const compHeaders = getCompositionGridHeaders(page);
    const milkFatStr = comp_key_as_med_str(CompKey.MilkFat);

    const exec_time = await timeExecution(async () => {
      await ingNameInput.fill("2% Milk");
      await expect(await compHeaders.allTextContents()).toContain(milkFatStr);
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

    await pastToClipboard(page, browserName, REFERENCE_RECIPE_TEXT);
    const pasteButton = getPasteButton(page);

    const lastIngIdx = 9;
    const lastIngNameInput = getIngredientNameInputAtIdx(page, lastIngIdx);
    const lastIngQtyInput = getIngredientQtyInputAtIdx(page, lastIngIdx);
    const propServingTemp = getMixPropertyValueElement(page, fpdToPropKey(FpdKey.ServingTemp));
    const compHeaders = getCompositionGridHeaders(page);
    const energyStr = comp_key_as_med_str(CompKey.Energy);

    const exec_time = await timeExecution(async () => {
      await pasteButton.click();
      await expect(lastIngNameInput).toBeVisible();
      await expect(lastIngQtyInput).toBeVisible();
      await expect(propServingTemp).toBeVisible();

      await expect(lastIngNameInput).toHaveValue("Vanilla Extract");
      await expect(lastIngQtyInput).toHaveValue("6");
      await expect(propServingTemp).toHaveText("-13.37");

      await expect(await compHeaders.allTextContents()).toContain(energyStr);
      const energyCompValue = await getCompositionValueElement(page, lastIngIdx, CompKey.Energy);
      await expect(energyCompValue).toBeVisible();
      await expect(energyCompValue).toHaveText("11.5");
    });

    expect(exec_time).toBeLessThan(THRESHOLDS.paste_response);
  });
});
