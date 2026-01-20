import { type Page } from "@playwright/test";

import { CompKey, comp_key_as_med_str, PropKey, prop_key_as_med_str } from "@workspace/sci-cream";

import { Metric } from "@/lib/web-vitals";

declare global {
  interface Window {
    __webVitals: Record<string, Metric>;
  }
}

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

  console.log(
    `${name}: [${Math.round(min)}ms, ${Math.round(avg)}ms, ${Math.round(max)}ms], ${countRuns} runs`,
  );
  return { avg, min, max };
}

export async function timeExecution(fn: () => Promise<void>): Promise<number> {
  const start = Date.now();
  await fn();
  return Date.now() - start;
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
