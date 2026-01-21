import { test, expect, type Page, Locator } from "@playwright/test";

import * as fs from "fs";
import * as path from "path";

import {
  type BenchmarkResult,
  doBenchmarkMeasurements as doBenchmarkMeasurementsGeneric,
  formatBenchmarkResultForUpload,
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
  getRecipeSelector,
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
    console.log(`  ${name}: ${parseFloat(metric.value.toFixed(2))} (rating: ${metric.rating})`);

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

// Collect all benchmark results for output
const allBenchmarkResults: Array<BenchmarkResult> = [];

function doBenchmarkMeasurements(name: string, run: () => Promise<number>) {
  return doBenchmarkMeasurementsGeneric(COUNT_RUNS, name, run).then((result) => {
    allBenchmarkResults.push(result);
    return result;
  });
}

test.describe("UI Responsiveness Performance Benchmarks", () => {
  test("should measure initial page load time", async ({ page }) => {
    await doBenchmarkMeasurements("Initial page load", async () => {
      return timeExecution(async () => {
        await page.goto("");
        await page.waitForLoadState("networkidle");
      });
    });
  });

  test("should measure recipe ingredient input responsiveness", async ({ page }) => {
    await doBenchmarkMeasurements("Ingredient name input", async () => {
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
    await doBenchmarkMeasurements("Ingredient name input to composition", async () => {
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
    });
  });

  test("should measure recipe quantity input responsiveness", async ({ page }) => {
    await doBenchmarkMeasurements("Ingredient quantity input", async () => {
      await page.goto("");
      await page.waitForLoadState("networkidle");

      const ingQtyInput = getIngredientQtyInputAtIdx(page, 0);

      return timeExecution(async () => {
        await ingQtyInput.fill("100");
        await expect(ingQtyInput).toBeVisible();
        await expect(ingQtyInput).toHaveValue("100");
      });
    });
  });

  test("should measure properties grid quantity input responsiveness", async ({ page }) => {
    await doBenchmarkMeasurements("Ingredient quantity input to mix property", async () => {
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
    });
  });

  type RecipePasteElements = {
    lastIngIdx: number;
    lastIngNameInput: Locator;
    lastIngQtyInput: Locator;
    propServingTemp: Locator;
    compHeaders: Locator;
    energyStr: string;
  };

  const recipePasteCheckElements = async (page: Page) => {
    const lastIngIdx = 9;
    const lastIngNameInput = getIngredientNameInputAtIdx(page, lastIngIdx);
    const lastIngQtyInput = getIngredientQtyInputAtIdx(page, lastIngIdx);
    const propServingTemp = getMixPropertyValueElement(page, fpdToPropKey(FpdKey.ServingTemp));
    const compHeaders = getCompositionGridHeaders(page);
    const energyStr = comp_key_as_med_str(CompKey.Energy);

    return {
      lastIngIdx,
      lastIngNameInput,
      lastIngQtyInput,
      propServingTemp,
      compHeaders,
      energyStr,
    };
  };

  const recipePasteCompleted = async (page: Page, elements: RecipePasteElements) => {
    await expect(elements.lastIngNameInput).toBeVisible();
    await expect(elements.lastIngQtyInput).toBeVisible();
    await expect(elements.propServingTemp).toBeVisible();

    await expect(elements.lastIngNameInput).toHaveValue("Vanilla Extract");
    await expect(elements.lastIngQtyInput).toHaveValue("6");
    await expect(elements.propServingTemp).toHaveText("-13.37");

    await expect(await elements.compHeaders.allTextContents()).toContain(elements.energyStr);
    const energyCompValue = await getCompositionValueElement(
      page,
      elements.lastIngIdx,
      CompKey.Energy,
    );
    await expect(energyCompValue).toBeVisible();
    await expect(energyCompValue).toHaveText("11.5");
  };

  test("should measure recipe paste responsiveness", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    await doBenchmarkMeasurements("Recipe paste", async () => {
      await page.goto("");
      await page.waitForLoadState("networkidle");

      await pastToClipboard(page, browserName, RECIPE_TEXT);
      const pasteButton = getPasteButton(page);

      const recipePasteElements = await recipePasteCheckElements(page);

      return timeExecution(async () => {
        await pasteButton.click();
        await recipePasteCompleted(page, recipePasteElements);
      });
    });
  });

  test("should measure recipe switch responsiveness", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    await doBenchmarkMeasurements("Recipe switch", async () => {
      await page.goto("");
      await page.waitForLoadState("networkidle");

      await pastToClipboard(page, browserName, RECIPE_TEXT);
      const pasteButton = getPasteButton(page);
      await pasteButton.click();

      const elements = await recipePasteCheckElements(page);
      await recipePasteCompleted(page, elements);

      const recipeSelector = getRecipeSelector(page);
      await expect(recipeSelector).toBeVisible();
      await expect(recipeSelector).toBeEnabled();

      return timeExecution(async () => {
        await recipeSelector.selectOption({ value: "1" });
        await expect(elements.lastIngNameInput).toBeVisible();
        await expect(elements.lastIngQtyInput).toBeVisible();

        await expect(elements.lastIngNameInput).toHaveValue("");
        await expect(elements.lastIngQtyInput).toHaveValue("");

        await recipeSelector.selectOption({ value: "0" });
        await recipePasteCompleted(page, elements);
      });
    });
  });

  // Write results to file after all benchmarks complete
  test.afterAll(() => {
    const forUpload = allBenchmarkResults.map((result) => formatBenchmarkResultForUpload(result));

    const outputDir = path.join(process.cwd(), "bench-results");
    fs.mkdirSync(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, "bench_output_ui.json");
    fs.writeFileSync(outputPath, JSON.stringify(forUpload, null, 2));
    console.log(`\nBenchmark results written to: ${outputPath}`);
  });
});
