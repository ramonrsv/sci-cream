import { test, expect, type Page } from "@playwright/test";

import {
  doBenchmarkMeasurements,
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

test("should collect web vitals metrics and be good", async ({ page }) => {
  await page.goto("");

  await page.waitForLoadState("networkidle");
  await page.waitForLoadState("load");

  // Interact with page to trigger INP/FID
  await page.getByRole("heading", { name: "Ice Cream Recipe Calculator" }).click();
  await page.waitForTimeout(1000);

  const webVitals = await page.evaluate(() => window.__webVitals || {});

  console.log("Web Vitals collected:", Object.keys(webVitals));
  expect(Object.keys(webVitals).length).toBeGreaterThan(0);

  for (const [name, metric] of Object.keys(webVitals).map((key) => [key, webVitals[key]])) {
    console.log(`${name}: ${parseFloat(metric.value.toFixed(2))} (rating: ${metric.rating})`);

    expect(metric).toHaveProperty("value");
    expect(metric).toHaveProperty("rating");
    expect(metric.rating).toEqual("good");
  }
});

const COUNT_RUNS = 10;

const RECIPE_TEXT = [
  "Ingredient\tQty(g)",
  "Whole Milk\t245",
  "Whipping Cream\t215",
  "Cocoa Powder, 17% Fat\t28",
  "Skimmed Milk Powder\t21",
  "Egg Yolk\t18",
  "Dextrose\t45",
  "Fructose\t32",
  "Salt\t0.5",
  "Rich Ice Cream SB\t1.25",
  "Vanilla Extract\t6",
].join("\n");

test.describe("UI Responsiveness Performance Benchmarks", () => {
  test("should measure initial page load time", async ({ page }) => {
    await doBenchmarkMeasurements(COUNT_RUNS, "Initial page load time", async () => {
      return timeExecution(async () => {
        await page.goto("");
        await page.waitForLoadState("networkidle");
      });
    });
  });

  test("should measure recipe ingredient input responsiveness", async ({ page }) => {
    await doBenchmarkMeasurements(COUNT_RUNS, "Ingredient name input time", async () => {
      await page.goto("");
      await page.waitForLoadState("networkidle");

      const ingNameInput = getIngredientNameInputAtIdx(page, 0);

      return timeExecution(async () => {
        await ingNameInput.fill("2% Milk");
        await expect(ingNameInput).toBeVisible();
        await expect(ingNameInput).toHaveValue("2% Milk");
      });
    });
  });

  test("should measure composition grid ingredient input responsiveness", async ({ page }) => {
    await doBenchmarkMeasurements(
      COUNT_RUNS,
      "Ingredient name input to composition time",
      async () => {
        await page.goto("");
        await page.waitForLoadState("networkidle");

        const compGridQtyToggle = getCompositionGridQtyToggleInput(page);
        await compGridQtyToggle.selectOption(QtyToggle.Composition);

        const ingNameInput = getIngredientNameInputAtIdx(page, 0);
        const compHeaders = getCompositionGridHeaders(page);
        const milkFatStr = comp_key_as_med_str(CompKey.MilkFat);

        const start = Date.now();
        await ingNameInput.fill("2% Milk");
        await expect(await compHeaders.allTextContents()).toContain(milkFatStr);
        const milkFatCompValue = await getCompositionValueElement(page, 0, CompKey.MilkFat);
        await expect(milkFatCompValue).toBeVisible();
        await expect(milkFatCompValue).toHaveText("2");
        return Date.now() - start;
      },
    );
  });

  test("should measure recipe quantity input responsiveness", async ({ page }) => {
    const { avg } = await doBenchmarkMeasurements(
      COUNT_RUNS,
      "Ingredient quantity input time",
      async () => {
        await page.goto("");
        await page.waitForLoadState("networkidle");

        const ingQtyInput = getIngredientQtyInputAtIdx(page, 0);

        return timeExecution(async () => {
          await ingQtyInput.fill("100");
          await expect(ingQtyInput).toBeVisible();
          await expect(ingQtyInput).toHaveValue("100");
        });
      },
    );
  });

  test("should measure properties grid quantity input responsiveness", async ({ page }) => {
    await doBenchmarkMeasurements(
      COUNT_RUNS,
      "Ingredient quantity input to property time",
      async () => {
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

        return timeExecution(async () => {
          await ingQtyInput.fill("100");
          await expect(milkFatPropValue).toBeVisible();
          await expect(milkFatPropValue).toHaveText("2");
        });
      },
    );
  });

  test("should measure recipe paste responsiveness", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    await doBenchmarkMeasurements(COUNT_RUNS, "Recipe paste time", async () => {
      await page.goto("");
      await page.waitForLoadState("networkidle");

      await pastToClipboard(page, browserName, RECIPE_TEXT);
      const pasteButton = getPasteButton(page);

      const lastIngIdx = 9;
      const lastIngNameInput = getIngredientNameInputAtIdx(page, lastIngIdx);
      const lastIngQtyInput = getIngredientQtyInputAtIdx(page, lastIngIdx);
      const propServingTemp = getMixPropertyValueElement(page, fpdToPropKey(FpdKey.ServingTemp));
      const compHeaders = getCompositionGridHeaders(page);
      const energyStr = comp_key_as_med_str(CompKey.Energy);

      return timeExecution(async () => {
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
    });
  });
});
