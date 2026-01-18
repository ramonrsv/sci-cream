import { test, expect, type Page } from "@playwright/test";

import { QtyToggle } from "@/lib/ui/key-selection";
import {
  CompKey,
  comp_key_as_med_str,
  FpdKey,
  compToPropKey,
  fpdToPropKey,
  PropKey,
  prop_key_as_med_str,
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

  console.log("Web Vitals collected:", Object.keys(webVitals));
  expect(Object.keys(webVitals).length).toBeGreaterThan(0);

  for (const [name, metric] of Object.keys(webVitals).map((key) => [key, webVitals[key]])) {
    console.log(`${name}: ${parseFloat(metric.value.toFixed(2))} (rating: ${metric.rating})`);

    expect(metric).toHaveProperty("value");
    expect(metric).toHaveProperty("rating");
    expect(metric.rating).toEqual("good");
  }
});

const THRESHOLDS = { page_load: 2000, input_response: 250 * 2, paste_response: 500 * 2 };

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

test.describe("UI Performance Benchmarks", () => {
  const doBenchmarkMeasurements = async (name: string, run: () => Promise<number>) => {
    const measurements: number[] = [];
    const NUM_RUNS = 5;

    for (let i = 0; i < NUM_RUNS; i++) {
      measurements.push(await run());
    }

    const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);

    console.log(
      `${name}: [${Math.round(min)}ms, ${Math.round(avg)}ms, ${Math.round(max)}ms], ${NUM_RUNS} runs`,
    );
    return { avg, min, max };
  };

  const timeExecution = async (fn: () => Promise<void>): Promise<number> => {
    const start = Date.now();
    await fn();
    return Date.now() - start;
  };

  test("should measure initial page load time", async ({ page }) => {
    const { avg } = await doBenchmarkMeasurements("Initial page load time", async () => {
      return timeExecution(async () => {
        await page.goto("");
        await page.waitForLoadState("networkidle");
      });
    });

    expect(avg).toBeLessThan(THRESHOLDS.page_load);
  });

  const getIngredientNameInputAtIdx = (page: Page, index: number) => {
    return page.locator('input[type="search"]').nth(index);
  };

  const getIngredientQtyInputAtIdx = (page: Page, index: number) => {
    return page.locator('input[type="number"]').nth(index);
  };

  const getMixPropertiesQtyToggleInput = (page: Page) => {
    return page.locator("#mix-properties-grid #key-selection select").first();
  };

  const getCompositionGridQtyToggleInput = (page: Page) => {
    return page.locator("#ing-composition-grid #key-selection select").first();
  };

  const getMixPropertyValueElement = (page: Page, propKey: PropKey, recipeIdx: number = 0) => {
    return page
      .locator("#mix-properties-grid table tbody tr")
      .filter({ has: page.locator("td", { hasText: prop_key_as_med_str(propKey) }) })
      .locator("td.comp-val")
      .nth(recipeIdx);
  };

  const getCompositionGridHeaders = (page: Page) => {
    return page.locator("#ing-composition-grid table thead th");
  };

  const getCompositionValueElement = async (page: Page, ingIdx: number, compKey: CompKey) => {
    const headersTxt = await getCompositionGridHeaders(page).allTextContents();
    const colIdx = headersTxt.findIndex((text) => text.includes(comp_key_as_med_str(compKey)));

    return page
      .locator("#ing-composition-grid table tbody tr")
      .nth(ingIdx)
      .locator("td")
      .nth(colIdx);
  };

  const pastToClipboard = async (page: Page, browserName: string, text: string) => {
    const permissions = browserName === "firefox" ? [] : ["clipboard-read", "clipboard-write"];
    page.context().grantPermissions(permissions);

    await page.evaluate(async (text) => {
      await navigator.clipboard.writeText(text);
    }, text);
  };

  const getPasteButton = (page: Page) => {
    return page.getByRole("button", { name: "Paste" });
  };

  test("should measure recipe ingredient input responsiveness", async ({ page }) => {
    const { avg } = await doBenchmarkMeasurements("Input to display time", async () => {
      await page.goto("");
      await page.waitForLoadState("networkidle");

      const ingNameInput = getIngredientNameInputAtIdx(page, 0);

      return timeExecution(async () => {
        await ingNameInput.fill("2% Milk");
        await expect(ingNameInput).toBeVisible();
        await expect(ingNameInput).toHaveValue("2% Milk");
      });
    });

    expect(avg).toBeLessThan(THRESHOLDS.input_response);
  });

  test("should measure composition grid ingredient input responsiveness", async ({ page }) => {
    const { avg } = await doBenchmarkMeasurements("Input to display time", async () => {
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

    expect(avg).toBeLessThan(THRESHOLDS.input_response);
  });

  test("should measure recipe quantity input responsiveness", async ({ page }) => {
    const { avg } = await doBenchmarkMeasurements("Input to display time", async () => {
      await page.goto("");
      await page.waitForLoadState("networkidle");

      const ingQtyInput = getIngredientQtyInputAtIdx(page, 0);

      return timeExecution(async () => {
        await ingQtyInput.fill("100");
        await expect(ingQtyInput).toBeVisible();
        await expect(ingQtyInput).toHaveValue("100");
      });
    });

    expect(avg).toBeLessThan(THRESHOLDS.input_response);
  });

  test("should measure properties grid quantity input responsiveness", async ({ page }) => {
    const { avg } = await doBenchmarkMeasurements("Input to display time", async () => {
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

    expect(avg).toBeLessThan(THRESHOLDS.input_response);
  });

  test("should measure recipe paste responsiveness", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    const { avg } = await doBenchmarkMeasurements("Paste to display time", async () => {
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

    expect(avg).toBeLessThan(THRESHOLDS.paste_response);
  });
});
