import { expect, type Page, type Locator } from "@playwright/test";

import {
  CompKey,
  comp_key_as_med_str,
  FpdKey,
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

export type BenchmarkResult = {
  name: string;
  avg: number;
  min: number;
  max: number;
  stdDev: number;
};

export type BenchmarkResultForUpload = { name: string; unit: string; value: number; range: string };

export async function doBenchmarkMeasurements(
  countRuns: number,
  name: string,
  run: () => Promise<number>,
) {
  const measurements: number[] = [];

  for (let i = 0; i < countRuns; i++) {
    measurements.push(await run());
  }

  const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;
  const min = Math.min(...measurements);
  const max = Math.max(...measurements);

  const stdDev = Math.sqrt(
    measurements.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / measurements.length,
  );

  const fmtTime = (t: number) => `${Math.round(t).toFixed(0).padStart(4)}ms`;
  console.log(`${name.padEnd(45)} time:   [${fmtTime(min)}, ${fmtTime(avg)}, ${fmtTime(max)}]`);

  return { name, avg, min, max, stdDev };
}

export function formatBenchmarkResultForUpload(result: BenchmarkResult) {
  return {
    name: result.name,
    unit: "ms",
    value: result.avg.toFixed(2),
    range: result.stdDev.toFixed(2),
  };
}

export async function timeExecution(fn: () => Promise<void>, divider: number = 1): Promise<number> {
  const start = Date.now();
  await fn();
  return (Date.now() - start) / divider;
}

export function getIngredientNameInputAtIdx(page: Page, index: number) {
  return page.locator('input[type="search"]').nth(index);
}

export function getIngredientQtyInputAtIdx(page: Page, index: number) {
  return page.locator('input[type="number"]').nth(index);
}

export function getMixPropertiesQtyToggleInput(page: Page) {
  return page.locator("#mix-properties-grid #key-selection select").first();
}

export function getCompositionGridQtyToggleInput(page: Page) {
  return page.locator("#ing-composition-grid #key-selection select").first();
}

export function getMixPropertyValueElement(page: Page, propKey: PropKey, recipeIdx: number = 0) {
  return page
    .locator("#mix-properties-grid table tbody tr")
    .filter({ has: page.locator("td", { hasText: prop_key_as_med_str(propKey) }) })
    .locator("td.comp-val")
    .nth(recipeIdx);
}

export function getCompositionGridHeaders(page: Page) {
  return page.locator("#ing-composition-grid table thead th");
}

export async function getCompositionValueElement(page: Page, ingIdx: number, compKey: CompKey) {
  const headersTxt = await getCompositionGridHeaders(page).allTextContents();
  const colIdx = headersTxt.findIndex((text) => text.includes(comp_key_as_med_str(compKey)));

  return page.locator("#ing-composition-grid table tbody tr").nth(ingIdx).locator("td").nth(colIdx);
}

export async function pastToClipboard(page: Page, browserName: string, text: string) {
  const permissions = browserName === "firefox" ? [] : ["clipboard-read", "clipboard-write"];
  page.context().grantPermissions(permissions);

  await page.evaluate(async (text) => {
    await navigator.clipboard.writeText(text);
  }, text);
}

export function getPasteButton(page: Page) {
  return page.getByRole("button", { name: "Paste" });
}

export function getRecipeSelector(page: Page) {
  return page.locator("#recipe-grid select").first();
}

export type RecipePasteElements = {
  ingredientIdx: number;
  ingNameInput: Locator;
  ingQtyInput: Locator;
  propServingTemp: Locator;
  compHeaders: Locator;
  energyStr: string;
};

export async function recipePasteCheckElements(page: Page, ingredientIdx: number) {
  const ingNameInput = getIngredientNameInputAtIdx(page, ingredientIdx);
  const ingQtyInput = getIngredientQtyInputAtIdx(page, ingredientIdx);
  const propServingTemp = getMixPropertyValueElement(page, fpdToPropKey(FpdKey.ServingTemp));
  const compHeaders = getCompositionGridHeaders(page);
  const energyStr = comp_key_as_med_str(CompKey.Energy);

  return { ingredientIdx, ingNameInput, ingQtyInput, propServingTemp, compHeaders, energyStr };
}

export async function recipeUpdateCompleted(
  page: Page,
  elements: RecipePasteElements,
  expected: { name: string; qty: number; servingTemp: string; energy: string },
) {
  await expect(elements.ingNameInput).toBeVisible();
  await expect(elements.ingQtyInput).toBeVisible();
  await expect(elements.propServingTemp).toBeVisible();

  await expect(elements.ingNameInput).toHaveValue(expected.name);
  await expect(elements.ingQtyInput).toHaveValue(expected.qty.toString());
  await expect(elements.propServingTemp).toHaveText(expected.servingTemp);

  await page.getByRole("columnheader", { name: elements.energyStr }).waitFor();
  const energyCompValue = await getCompositionValueElement(
    page,
    elements.ingredientIdx,
    CompKey.Energy,
  );
  await expect(energyCompValue).toBeVisible();
  await expect(energyCompValue).toHaveText(expected.energy);
}
