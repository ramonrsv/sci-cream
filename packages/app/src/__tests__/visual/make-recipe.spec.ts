import { test, expect, type Page } from "@playwright/test";

import type { Batch } from "@/lib/batch";
import { goToPageAndWaitFor } from "@/__tests__/e2e/util";
import { setViewportHeightForAllAppContentScreenshot } from "@/__tests__/visual/util";
import {
  VIEWPORT_MOBILE_LARGE_PORTRAIT,
  VIEWPORT_MOBILE_SMALL_PORTRAIT,
  VIEWPORT_TABLET_PORTRAIT,
} from "@/__tests__/visual/assets";
import { encodeBatchPayload, makeBatchPayload } from "@/lib/batch-share";
import { STORAGE_KEYS } from "@/lib/local-storage";

/** The handheld layouts a recipient is most likely weighing from. */
const PORTRAIT_VIEWPORTS = [
  VIEWPORT_MOBILE_SMALL_PORTRAIT,
  VIEWPORT_MOBILE_LARGE_PORTRAIT,
  VIEWPORT_TABLET_PORTRAIT,
];

/** Owner mode dates the batch today, which would rebase every snapshot daily. */
const FIXED_DATE = "2026-07-18";

/** Two recipes sharing "Sucrose", so a merged row and single-recipe rows both appear. */
const SLOTS = [
  { name: "Strawberry Sorbet", serializedRows: "Strawberry\t300\nSucrose\t100\nWater\t250" },
  { name: "Vanilla Base", serializedRows: "Whole Milk\t500\nSucrose\t120\n35% Cream\t150" },
  { name: "", serializedRows: "" },
];

/** Seed the calculator slots so owner mode has recipes to offer. */
async function seedSlots(page: Page) {
  await page.addInitScript(
    ([key, stores]) => {
      window.localStorage.setItem(key as string, JSON.stringify(stores));
    },
    [STORAGE_KEYS.recipeStores, SLOTS],
  );
}

/** Open owner mode with the slots seeded and the date pinned. */
async function openOwnerPage(page: Page, { recipes = 0 }: { recipes?: number } = {}) {
  await seedSlots(page);
  await goToPageAndWaitFor(page, "/make-recipe");
  await expect(page.getByTestId("make-recipe-view")).toBeVisible();

  await page.getByTestId("batch-date").fill(FIXED_DATE);
  for (let slot = 0; slot < recipes; slot++) {
    await page.getByTestId("batch-add-recipe").selectOption(`slot:${String(slot)}`);
  }
  if (recipes > 0) await expect(page.getByTestId("batch-checklist")).toBeVisible();
}

/** A shared batch with a title and notes, so link mode's legend and notes both render. */
const SHARED_BATCH: Batch = {
  title: "Friday test batch",
  date: FIXED_DATE,
  notes: "Age 12 h at 4 °C, then churn cold.",
  recipes: [
    {
      name: "Strawberry Sorbet",
      rows: [
        ["Strawberry", 300],
        ["Sucrose", 100],
      ],
    },
    {
      name: "Vanilla Base",
      rows: [
        ["Whole Milk", 500],
        ["Sucrose", 120],
      ],
    },
  ],
};

/**
 * Four recipes sharing a pantry, so rows span every column count from one to four.
 * Only a link reaches this width: the calculator has `MAX_RECIPES` slots.
 */
const SHARED_BATCH_WIDE: Batch = {
  title: "Four-way tasting batch",
  date: FIXED_DATE,
  recipes: [
    {
      name: "Strawberry Sorbet",
      rows: [
        ["Strawberry", 300],
        ["Sucrose", 100],
        ["Water", 250],
      ],
    },
    {
      name: "Vanilla Base",
      rows: [
        ["Whole Milk", 500],
        ["Sucrose", 120],
        ["35% Cream", 150],
      ],
    },
    {
      name: "Chocolate Base",
      rows: [
        ["Whole Milk", 400],
        ["Sucrose", 90],
        ["Cocoa Powder", 60],
      ],
    },
    {
      name: "Pistachio Base",
      rows: [
        ["Whole Milk", 450],
        ["Sucrose", 110],
        ["35% Cream", 100],
        ["Shoei Pistachio Paste", 80],
      ],
    },
  ],
};

/** Open a batch through a real share link, as a recipient would. */
async function goToSharedLink(page: Page, batch: Batch = SHARED_BATCH) {
  const encoded = await encodeBatchPayload(makeBatchPayload(batch));
  await goToPageAndWaitFor(page, `/make-recipe#${encoded}`);
  await expect(page.getByTestId("batch-checklist")).toBeVisible();
}

/** Screenshot the whole checklist page, grown to fit its content. */
async function shootPage(page: Page, name: string) {
  // Park the cursor off the checklist, or it hover-tints whichever cell sits beneath it.
  await page.mouse.move(0, 0);
  await setViewportHeightForAllAppContentScreenshot(page);
  await expect(page.getByTestId("make-recipe-view")).toHaveScreenshot(name);
}

/**
 * Screenshot the scroll container at its right-hand end, showing the columns a narrow viewport
 * hides. Shooting the scroller keeps the offset; the checklist's own box is the whole table.
 */
async function shootScrolledToLastColumn(page: Page, name: string) {
  const scroller = page.getByTestId("app-content");
  await setViewportHeightForAllAppContentScreenshot(page);

  // Guard: with no overflow this would silently duplicate the unscrolled snapshot.
  const overflow = await scroller.evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeGreaterThan(0);

  await scroller.evaluate((el) => {
    el.scrollTo({ left: el.scrollWidth, behavior: "instant" as ScrollBehavior });
  });
  await page.mouse.move(0, 0);
  await expect(scroller).toHaveScreenshot(name);
}

test.describe("Visual Regression: Make Recipe", () => {
  test("make recipe - empty", async ({ page }) => {
    await openOwnerPage(page);
    await expect(page.getByTestId("checklist-empty")).toBeVisible();
    await shootPage(page, "make-recipe-empty.png");
  });

  test("make recipe - empty - dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await openOwnerPage(page);
    await expect(page.getByTestId("checklist-empty")).toBeVisible();
    await shootPage(page, "make-recipe-empty-dark.png");
  });

  test("make recipe - one recipe carries the unit in its own column", async ({ page }) => {
    // The lone-recipe header drops the batch total and the letter badges, so it is its own layout.
    await openOwnerPage(page, { recipes: 1 });
    await shootPage(page, "make-recipe-single.png");
  });

  test("make recipe - two recipes merged", async ({ page }) => {
    await openOwnerPage(page, { recipes: 2 });
    await shootPage(page, "make-recipe-recipes.png");
  });

  test("make recipe - two recipes merged - dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await openOwnerPage(page, { recipes: 2 });
    await shootPage(page, "make-recipe-recipes-dark.png");
  });

  test("make recipe - some amounts checked off", async ({ page }) => {
    await openOwnerPage(page, { recipes: 2 });

    // One cell of a shared row and one of a single-recipe row: both leave their row unfinished,
    // so this pins the checked cell against its unchecked neighbours in the same column.
    await page.getByTestId("checklist-cell-0-Sucrose").click();
    await page.getByTestId("checklist-cell-0-Strawberry").click();
    await expect(page.getByTestId("batch-progress")).toContainText("2 of 6 weighed");

    await shootPage(page, "make-recipe-cells-checked.png");
  });

  test("make recipe - whole rows checked off", async ({ page }) => {
    await openOwnerPage(page, { recipes: 2 });

    // Sucrose needs both recipes before the row reads as done; Strawberry needs only its one cell.
    await page.getByTestId("checklist-cell-0-Sucrose").click();
    await page.getByTestId("checklist-cell-1-Sucrose").click();
    await page.getByTestId("checklist-cell-0-Strawberry").click();
    await expect(page.getByTestId("checklist-row-Sucrose")).toHaveAttribute("data-done", "true");
    await expect(page.getByTestId("checklist-row-Strawberry")).toHaveAttribute("data-done", "true");

    await shootPage(page, "make-recipe-rows-done.png");
  });

  test("make recipe - shared link, as the recipient sees it", async ({ page }) => {
    await goToSharedLink(page);

    // Link mode swaps the builder for the legend and notes, and drops the share action
    await shootPage(page, "make-recipe-shared.png");
  });

  // The recipient reads this at the bench, phone or tablet in hand, so the narrow layouts are the
  // ones that matter most: the checklist is a table, and its columns are what run out of width.
  for (const { name, viewport, screenshot } of PORTRAIT_VIEWPORTS) {
    test(`make recipe - shared link - ${name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await goToSharedLink(page);

      await shootPage(page, `make-recipe-shared-${screenshot}.png`);
    });
  }

  test("make recipe - four recipes", async ({ page }) => {
    await goToSharedLink(page, SHARED_BATCH_WIDE);
    await expect(page.getByTestId("batch-progress")).toContainText("0 of 13 weighed");

    await shootPage(page, "make-recipe-wide.png");
  });

  // Six columns on a handheld screen: the tightest the checklist gets before it scrolls sideways.
  for (const { name, viewport, screenshot } of PORTRAIT_VIEWPORTS) {
    test(`make recipe - four recipes - ${name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await goToSharedLink(page, SHARED_BATCH_WIDE);

      await shootPage(page, `make-recipe-wide-${screenshot}.png`);
    });
  }

  // Only the small phone hides a whole column, so only it earns a second shot: the large phone
  // overflows by a few pixels with recipe D already visible, and the tablet does not overflow.
  test("make recipe - four recipes, scrolled to the last column", async ({ page }) => {
    await page.setViewportSize(VIEWPORT_MOBILE_SMALL_PORTRAIT.viewport);
    await goToSharedLink(page, SHARED_BATCH_WIDE);

    await shootScrolledToLastColumn(page, "make-recipe-wide-scrolled-mobile-small-portrait.png");
  });

  test("make recipe - invalid link error", async ({ page }) => {
    await goToPageAndWaitFor(page, "/make-recipe#not-a-real-payload");
    await expect(page.getByTestId("make-recipe-error")).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(page.getByTestId("make-recipe-error")).toHaveScreenshot("make-recipe-error.png");
  });
});

test.describe("Visual Regression: Batch Share Dialog", () => {
  test("batch share dialog - popup", async ({ page }) => {
    await openOwnerPage(page, { recipes: 2 });
    await page.getByTestId("share-batch-button").click();

    const dialog = page.getByTestId("batch-share-dialog");
    await expect(dialog).toBeVisible();
    // Wait for the async encode to fill the field, or the placeholder would be captured instead
    await expect(page.getByTestId("batch-share-link")).toHaveValue(/\/make-recipe#.+/);

    // Mask the link: its origin and payload vary by run.
    await expect(dialog).toHaveScreenshot("batch-share-dialog.png", {
      mask: [page.getByTestId("batch-share-link")],
    });
  });

  test("batch share dialog - dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await openOwnerPage(page, { recipes: 2 });
    await page.getByTestId("share-batch-button").click();

    const dialog = page.getByTestId("batch-share-dialog");
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId("batch-share-link")).toHaveValue(/\/make-recipe#.+/);

    await expect(dialog).toHaveScreenshot("batch-share-dialog-dark.png", {
      mask: [page.getByTestId("batch-share-link")],
    });
  });
});
