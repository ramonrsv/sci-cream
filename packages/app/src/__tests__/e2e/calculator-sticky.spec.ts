import { test, expect, type Locator } from "@playwright/test";

import { KeyFilter } from "@/app/_elements/selects/key-filter-select";
import {
  DeltaToggle,
  DELTA_TOGGLE_SHORT_LABELS,
} from "@/app/_elements/selects/delta-toggle-select";
import { RecipeID } from "@/__tests__/assets";
import { selectOption } from "@/__tests__/e2e/select";
import {
  fillRecipeAndWaitForUpdate,
  getCompositionBreakdownPanelKeyFilterSelectInput,
  getPropertiesPanelKeyFilterSelectInput,
  getPropertiesPanelDeltaToggleSelectInput,
  goToPageAndWaitFor,
} from "@/__tests__/e2e/util";

/** Top edge (viewport y) of a locator's bounding box. */
async function topOf(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("locator has no bounding box");
  return box.y;
}

/** Left edge (viewport x) of a locator's bounding box. */
async function leftOf(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("locator has no bounding box");
  return box.x;
}

// A wide viewport keeps the calculator in an `md`+ breakpoint with the default panel geometry, so
// the properties list overflows vertically and the breakdown matrix overflows horizontally.
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await goToPageAndWaitFor(page, "/calculator");
  await fillRecipeAndWaitForUpdate(page, RecipeID.Main);
});

test.describe("Calculator sticky tables", () => {
  test("recipe editor header stays frozen while the pane scrolls vertically", async ({ page }) => {
    const pane = page.getByTestId("recipe-editor-table-pane");
    const header = pane.locator("thead.table-sticky-head");
    const firstRowInput = pane.locator("tbody input[type='search']").first();

    // Main's rows don't overflow the full-height pane, so cap it to create the vertical scroll.
    await pane.evaluate((el) => (el.style.maxHeight = "120px"));
    await expect
      .poll(() => pane.evaluate((el) => el.scrollHeight - el.clientHeight))
      .toBeGreaterThan(0);

    const paneTop = await topOf(pane);
    const headerTopBefore = await topOf(header);
    const firstRowTopBefore = await topOf(firstRowInput);
    expect(Math.abs(headerTopBefore - paneTop)).toBeLessThan(2);

    await pane.evaluate((el) => (el.scrollTop = 80));
    await expect.poll(() => pane.evaluate((el) => el.scrollTop)).toBeGreaterThan(20);
    const scrolled = await pane.evaluate((el) => el.scrollTop);

    // The sticky header holds its position at the pane's top…
    expect(Math.abs((await topOf(header)) - paneTop)).toBeLessThan(2);
    // …while the ingredient rows scrolled up by the scroll distance.
    expect(firstRowTopBefore - (await topOf(firstRowInput))).toBeCloseTo(scrolled, 0);
  });

  test("properties header stays frozen while the pane scrolls vertically", async ({ page }) => {
    // Show every property so the list overflows the pane's height and can scroll.
    await selectOption(page, getPropertiesPanelKeyFilterSelectInput(page), KeyFilter.All);

    const pane = page.getByTestId("properties-table-pane");
    const header = pane.locator("thead.table-sticky-head");
    const firstRowLabel = pane.locator("tbody td.table-pin-cell").first();

    const vOverflow = await pane.evaluate((el) => el.scrollHeight - el.clientHeight);
    expect(vOverflow).toBeGreaterThan(0);

    const paneTop = await topOf(pane);
    const headerTopBefore = await topOf(header);
    const firstRowTopBefore = await topOf(firstRowLabel);
    expect(Math.abs(headerTopBefore - paneTop)).toBeLessThan(2);

    // Scroll the body down by a meaningful amount.
    const scrollBy = 200;
    await pane.evaluate((el, by) => (el.scrollTop = by), scrollBy);
    await expect.poll(() => pane.evaluate((el) => el.scrollTop)).toBeGreaterThan(50);
    const scrolled = await pane.evaluate((el) => el.scrollTop);

    // The header holds its position at the pane's top instead of scrolling away with the body…
    expect(Math.abs((await topOf(header)) - paneTop)).toBeLessThan(2);
    // …while the body genuinely scrolled: its first row moved up by the scroll distance.
    expect(firstRowTopBefore - (await topOf(firstRowLabel))).toBeCloseTo(scrolled, 0);
  });

  test("properties keeps the Property column pinned while scrolling right", async ({ page }) => {
    // Multiple recipes plus a delta column give the table enough columns to overflow horizontally
    // (a single recipe's `w-full` Property column absorbs all slack and never scrolls sideways).
    await fillRecipeAndWaitForUpdate(page, RecipeID.RefA);
    await fillRecipeAndWaitForUpdate(page, RecipeID.RefB);
    await selectOption(
      page,
      getPropertiesPanelDeltaToggleSelectInput(page),
      DELTA_TOGGLE_SHORT_LABELS[DeltaToggle.Relative],
    );

    const pane = page.getByTestId("properties-table-pane");
    const propHead = pane.locator("thead th.table-pin-head"); // pinned "Property" column
    const firstValueHead = pane.locator("thead th.table-col-header:not(.table-pin-head)").first();

    // Cap the width so the columns overflow and the pane can scroll horizontally.
    await pane.evaluate((el) => (el.style.maxWidth = "260px"));
    await expect
      .poll(() => pane.evaluate((el) => el.scrollWidth - el.clientWidth))
      .toBeGreaterThan(0);

    const paneLeft = await leftOf(pane);
    const propLeftBefore = await leftOf(propHead);
    const valueLeftBefore = await leftOf(firstValueHead);
    expect(Math.abs(propLeftBefore - paneLeft)).toBeLessThan(2);

    await pane.evaluate((el) => (el.scrollLeft = 120));
    await expect.poll(() => pane.evaluate((el) => el.scrollLeft)).toBeGreaterThan(40);
    const scrolled = await pane.evaluate((el) => el.scrollLeft);

    // The pinned Property column holds its position at the pane's left edge…
    expect(Math.abs((await leftOf(propHead)) - propLeftBefore)).toBeLessThan(2);
    expect(Math.abs((await leftOf(propHead)) - paneLeft)).toBeLessThan(2);
    // …while a regular recipe column scrolls left by the scroll distance.
    expect(valueLeftBefore - (await leftOf(firstValueHead))).toBeCloseTo(scrolled, 0);
  });

  test("breakdown keeps Ingredient and Qty columns pinned while scrolling right", async ({
    page,
  }) => {
    // Show every composition column so the matrix overflows the container's width.
    await selectOption(page, getCompositionBreakdownPanelKeyFilterSelectInput(page), KeyFilter.All);

    const container = page.locator("#composition-breakdown-table");
    const pinnedHeads = container.locator("thead th.table-pin-head");
    const ingHead = pinnedHeads.nth(0);
    const qtyHead = pinnedHeads.nth(1);
    const firstCompHead = container.locator("thead th[data-comp-key]").first();

    const hOverflow = await container.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(hOverflow).toBeGreaterThan(0);

    const containerLeft = await leftOf(container);
    const ingLeftBefore = await leftOf(ingHead);
    const qtyLeftBefore = await leftOf(qtyHead);
    const compLeftBefore = await leftOf(firstCompHead);
    expect(Math.abs(ingLeftBefore - containerLeft)).toBeLessThan(2);

    // Scroll the matrix to the right.
    await container.evaluate((el) => (el.scrollLeft = 200));
    await expect.poll(() => container.evaluate((el) => el.scrollLeft)).toBeGreaterThan(50);
    const scrolled = await container.evaluate((el) => el.scrollLeft);

    // The pinned Ingredient/Qty columns hold their horizontal position…
    expect(Math.abs((await leftOf(ingHead)) - ingLeftBefore)).toBeLessThan(2);
    expect(Math.abs((await leftOf(qtyHead)) - qtyLeftBefore)).toBeLessThan(2);
    // …while a regular composition column scrolls left by the scroll distance.
    expect(compLeftBefore - (await leftOf(firstCompHead))).toBeCloseTo(scrolled, 0);
  });

  test("breakdown freezes the header and totals row together on vertical scroll", async ({
    page,
  }) => {
    await selectOption(page, getCompositionBreakdownPanelKeyFilterSelectInput(page), KeyFilter.All);

    const container = page.locator("#composition-breakdown-table");
    const header = container.locator("thead tr").nth(0);
    const totals = container.locator("thead tr").nth(1);
    const firstIngredient = container.locator("tbody td.table-pin-cell").first();

    // Main's ~10 rows don't overflow the full-height panel, so cap the container height to create
    // the vertical scroll needed to exercise the frozen header + totals.
    await container.evaluate((el) => (el.style.maxHeight = "160px"));
    await expect
      .poll(() => container.evaluate((el) => el.scrollHeight - el.clientHeight))
      .toBeGreaterThan(0);

    const headerTopBefore = await topOf(header);
    const totalsTopBefore = await topOf(totals);
    const firstIngredientTopBefore = await topOf(firstIngredient);

    await container.evaluate((el) => (el.scrollTop = 120));
    await expect.poll(() => container.evaluate((el) => el.scrollTop)).toBeGreaterThan(40);
    const scrolled = await container.evaluate((el) => el.scrollTop);

    // Header and totals rows both hold their positions (they share the sticky `<thead>`)…
    expect(Math.abs((await topOf(header)) - headerTopBefore)).toBeLessThan(2);
    expect(Math.abs((await topOf(totals)) - totalsTopBefore)).toBeLessThan(2);
    // …while the ingredient rows beneath them scrolled up by the scroll distance.
    expect(firstIngredientTopBefore - (await topOf(firstIngredient))).toBeCloseTo(scrolled, 0);
  });
});
