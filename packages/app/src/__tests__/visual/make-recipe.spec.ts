import { test, expect, type Page } from "@playwright/test";

import type { Batch } from "@/lib/batch/batch";
import { goToPageAndWaitFor, loginAsTestUserWithCredentials } from "@/__tests__/e2e/util";
import { TEST_USER_B } from "@/lib/database/assets";
import { parkCursor, setViewportHeightForAllAppContentScreenshot } from "@/__tests__/visual/util";
import {
  VIEWPORT_MOBILE_LARGE_PORTRAIT,
  VIEWPORT_MOBILE_SMALL_PORTRAIT,
  VIEWPORT_TABLET_PORTRAIT,
} from "@/__tests__/visual/assets";
import { encodeBatchPayload, makeBatchPayload } from "@/lib/batch/share";
import { STORAGE_KEYS } from "@/lib/local-storage";
import { CategoryColor } from "@/lib/styles/colors";

/** The ingredient column's dense-tier cap (`max-w-52`), in px: what three or four recipes leave. */
const INGREDIENT_COLUMN_MAX_PX = 208;

/**
 * Where the checklist fits without a sideways scroll, per phone and recipe count. The density
 * tiers in `densityFor` are sized against the small phone, so it is the row that constrains them.
 */
const FIT_MATRIX = [
  { ...VIEWPORT_MOBILE_SMALL_PORTRAIT, fitsUpTo: 3 },
  { ...VIEWPORT_MOBILE_LARGE_PORTRAIT, fitsUpTo: 4 },
];

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
 *
 * The pistachio paste is named long enough to pin the ingredient column to its `max-w-56` cap,
 * and every recipe carries a four-character amount, so each column sits at the width the handheld
 * layouts are tuned against. Relax either and the tight case quietly stops being tested.
 */
const SHARED_BATCH_WIDE: Batch = {
  title: "Four-way tasting batch",
  date: FIXED_DATE,
  recipes: [
    {
      name: "Strawberry Sorbet",
      rows: [
        ["Strawberry", 300],
        ["Sucrose", 97.5],
        ["Water", 250],
      ],
    },
    {
      name: "Vanilla Base",
      rows: [
        ["Whole Milk", 500],
        ["Sucrose", 82.5],
        ["35% Cream", 150],
      ],
    },
    {
      name: "Chocolate Base",
      rows: [
        ["Whole Milk", 400],
        ["Sucrose", 87.5],
        ["Cocoa Powder", 60],
      ],
    },
    {
      name: "Pistachio Base",
      rows: [
        ["Whole Milk", 450],
        ["Sucrose", 110],
        ["35% Cream", 100],
        ["Shoei Sicilian Pistachio Paste, unsalted", 82.5],
      ],
    },
  ],
};

/**
 * The same four recipes wearing picked container colors, including the achromatic pair. Those two
 * are painted solid rather than tinted, so they are the only colors with their own rendering path.
 */
const SHARED_BATCH_COLORED: Batch = {
  ...SHARED_BATCH_WIDE,
  recipes: [
    { ...SHARED_BATCH_WIDE.recipes[0]!, color: CategoryColor.White },
    { ...SHARED_BATCH_WIDE.recipes[1]!, color: CategoryColor.Black },
    { ...SHARED_BATCH_WIDE.recipes[2]!, color: CategoryColor.Purple },
    SHARED_BATCH_WIDE.recipes[3]!,
  ],
};

/**
 * Five recipes: more than any phone can show at once, so the checklist scrolls. The batch that
 * shows whether the dense tier leaves a useful number of recipes on screen while scrolling.
 */
const SHARED_BATCH_SCROLLING: Batch = {
  ...SHARED_BATCH_WIDE,
  title: "Five-way tasting batch",
  recipes: [
    ...SHARED_BATCH_WIDE.recipes,
    {
      name: "Coffee Base",
      rows: [
        ["Whole Milk", 425],
        ["Sucrose", 92.5],
        ["Espresso", 45],
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

/** Weigh off a cell of each solid fill and one tint, leaving Sucrose short of dimming its row. */
async function weighOffColoredCells(page: Page) {
  await page.getByTestId("checklist-cell-0-Sucrose").click();
  await page.getByTestId("checklist-cell-1-Sucrose").click();
  await page.getByTestId("checklist-cell-2-Whole Milk").click();

  // Assert the clicks landed, or a miss would quietly bake an unchecked page into the snapshot.
  await expect(page.getByTestId("batch-progress")).toContainText("3 of 13 weighed");
}

/** Screenshot the whole checklist page, grown to fit its content. */
async function shootPage(page: Page, name: string) {
  // Park the cursor off the checklist, or it hover-tints whichever cell sits beneath it.
  await parkCursor(page);
  await setViewportHeightForAllAppContentScreenshot(page);
  await expect(page.getByTestId("make-recipe-view")).toHaveScreenshot(name);
}

/** Screenshot just the batch editor (the detail panel), as it sits in a real viewport. */
async function shootEditor(page: Page, name: string) {
  await parkCursor(page);
  await expect(page.getByTestId("batch-editor")).toHaveScreenshot(name);
}

/** Width the checklist scrolls over. `scrollWidth` floors at `clientWidth`, so a fit reads 0. */
async function checklistOverflow(page: Page): Promise<number> {
  const scroller = page.getByTestId("checklist-scroll");
  return scroller.evaluate((el) => el.scrollWidth - el.clientWidth);
}

/** Assert no sideways scroll. */
async function expectNoHorizontalOverflow(page: Page) {
  expect(await checklistOverflow(page)).toBe(0);
}

/** A batch of `count` recipes at the tight case: a name past the cap, four-character amounts. */
function batchOfWidth(count: number): Batch {
  return {
    title: "Fit matrix",
    date: FIXED_DATE,
    recipes: Array.from({ length: count }, (_, index) => ({
      name: `Recipe ${String(index)}`,
      rows: [
        ["Shoei Sicilian Pistachio Paste, unsalted", 97.5],
        ["Whole Milk", 250],
      ] as [string, number][],
    })),
  };
}

/**
 * Screenshot the checklist scrolled to its right-hand end, revealing the columns a narrow viewport
 * hides. The scroll lives in the frozen-panes box, not the page, so that box is scrolled and shot.
 */
async function shootScrolledToLastColumn(page: Page, name: string) {
  const scroller = page.getByTestId("checklist-scroll");
  await setViewportHeightForAllAppContentScreenshot(page);

  // Guard: with no overflow this would silently duplicate the unscrolled snapshot.
  const overflow = await scroller.evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeGreaterThan(0);

  await scroller.evaluate((el) => {
    el.scrollTo({ left: el.scrollWidth, behavior: "instant" as ScrollBehavior });
  });
  await parkCursor(page);
  await expect(scroller).toHaveScreenshot(name);
}

test.describe("Visual Regression: Make Recipe", () => {
  test("make recipe - empty", async ({ page }) => {
    await openOwnerPage(page);
    await expect(page.getByTestId("checklist-empty")).toBeVisible();
    await shootEditor(page, "make-recipe-empty.png");
  });

  test("make recipe - empty - dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await openOwnerPage(page);
    await expect(page.getByTestId("checklist-empty")).toBeVisible();
    await shootEditor(page, "make-recipe-empty-dark.png");
  });

  test("make recipe - one recipe carries the unit in its own column", async ({ page }) => {
    // The lone-recipe header drops the batch total and the letter badges, so it is its own layout.
    await openOwnerPage(page, { recipes: 1 });
    await shootEditor(page, "make-recipe-single.png");
  });

  test("make recipe - two recipes merged", async ({ page }) => {
    await openOwnerPage(page, { recipes: 2 });
    await shootEditor(page, "make-recipe-recipes.png");
  });

  test("make recipe - two recipes merged - dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await openOwnerPage(page, { recipes: 2 });
    await shootEditor(page, "make-recipe-recipes-dark.png");
  });

  test("make recipe - some amounts checked off", async ({ page }) => {
    await openOwnerPage(page, { recipes: 2 });

    // One cell of a shared row and one of a single-recipe row: both leave their row unfinished,
    // so this pins the checked cell against its unchecked neighbours in the same column.
    await page.getByTestId("checklist-cell-0-Sucrose").click();
    await page.getByTestId("checklist-cell-0-Strawberry").click();
    await expect(page.getByTestId("batch-progress")).toContainText("2 of 6 weighed");

    await shootEditor(page, "make-recipe-cells-checked.png");
  });

  test("make recipe - whole rows checked off", async ({ page }) => {
    await openOwnerPage(page, { recipes: 2 });

    // Sucrose needs both recipes before the row reads as done; Strawberry needs only its one cell.
    await page.getByTestId("checklist-cell-0-Sucrose").click();
    await page.getByTestId("checklist-cell-1-Sucrose").click();
    await page.getByTestId("checklist-cell-0-Strawberry").click();
    await expect(page.getByTestId("checklist-row-Sucrose")).toHaveAttribute("data-done", "true");
    await expect(page.getByTestId("checklist-row-Strawberry")).toHaveAttribute("data-done", "true");

    await shootEditor(page, "make-recipe-rows-done.png");
  });

  test("make recipe - whole page, signed out", async ({ page }) => {
    // Owner mode's full layout: search bar, the sign-in list prompt, and the empty editor.
    await openOwnerPage(page);
    await expect(page.getByTestId("batch-list-empty")).toBeVisible();
    await shootPage(page, "make-recipe-page.png");
  });

  test("make recipe - whole page, signed out - dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await openOwnerPage(page);
    await expect(page.getByTestId("batch-list-empty")).toBeVisible();
    await shootPage(page, "make-recipe-page-dark.png");
  });

  test("make recipe - whole page, a saved batch loaded from the list", async ({ page }) => {
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await goToPageAndWaitFor(page, "/make-recipe");
    await expect(page.getByTestId("make-recipe-view")).toBeVisible();

    // Seeded batches populate the list; load the newest so it binds and its row highlights.
    // Click the title within the list; the whole card is one button, so its name isn't the title.
    await page.getByTestId("batch-list").getByText("Friday tasting batch", { exact: true }).click();
    await expect(page.getByTestId("batch-status-dot")).toHaveAttribute("aria-label", "Saved");
    await expect(page.locator('li[aria-current="true"]')).toContainText("Friday tasting batch");

    await shootPage(page, "make-recipe-page-loaded.png");
  });

  test("make recipe - shared link, as the recipient sees it", async ({ page }) => {
    await goToSharedLink(page);

    // Link mode swaps the builder for the legend and notes, and drops the share action
    await shootPage(page, "make-recipe-shared.png");
  });

  // The recipient reads this at the bench, phone or tablet in hand, so the narrow layouts are the
  // ones that matter most: the checklist is a table, and its columns are what run out of width.
  for (const { name, viewport, screenshot, hasTouch } of PORTRAIT_VIEWPORTS) {
    test.describe(`make recipe - shared link - ${name}`, () => {
      test.use({ hasTouch });

      test("shared link", async ({ page }) => {
        await page.setViewportSize(viewport);
        await goToSharedLink(page);

        await shootPage(page, `make-recipe-shared-${screenshot}.png`);
      });
    });
  }

  test("make recipe - four recipes", async ({ page }) => {
    await goToSharedLink(page, SHARED_BATCH_WIDE);
    await expect(page.getByTestId("batch-progress")).toContainText("0 of 13 weighed");

    await shootPage(page, "make-recipe-wide.png");
  });

  // Six columns on a handheld screen: the tightest the checklist gets before it scrolls sideways.
  for (const { name, viewport, screenshot, hasTouch } of PORTRAIT_VIEWPORTS) {
    test.describe(`make recipe - four recipes - ${name}`, () => {
      test.use({ hasTouch });

      test("four recipes", async ({ page }) => {
        await page.setViewportSize(viewport);
        await goToSharedLink(page, SHARED_BATCH_WIDE);

        await shootPage(page, `make-recipe-wide-${screenshot}.png`);
      });
    });
  }

  // The guarantee: four recipes and a name at its cap still fit a large phone without scrolling.
  // Asserted, not eyeballed — a screenshot of a scrolling table looks much like one that fits.
  // It assumes the sidebar at its default, unpinned: pinning spends 40px of the row on the rail,
  // and four recipes then scroll, which is the deliberate cost of that choice.
  test.describe("make recipe - four recipes, fits a large phone", () => {
    test.use({ hasTouch: VIEWPORT_MOBILE_LARGE_PORTRAIT.hasTouch });

    test("no horizontal overflow", async ({ page }) => {
      await page.setViewportSize(VIEWPORT_MOBILE_LARGE_PORTRAIT.viewport);
      await goToSharedLink(page, SHARED_BATCH_WIDE);

      // Pin both halves of the tight case, so a relaxed fixture fails here, not passing for free.
      for (const recipe of SHARED_BATCH_WIDE.recipes) {
        const widest = Math.max(...recipe.rows.map(([, quantity]) => String(quantity).length));
        expect(widest).toBeGreaterThanOrEqual(4);
      }

      const nameColumn = await page
        .getByTestId("checklist-header")
        .locator("th")
        .first()
        .evaluate((el) => Math.round(el.getBoundingClientRect().width));
      expect(nameColumn).toBe(INGREDIENT_COLUMN_MAX_PX);

      await expectNoHorizontalOverflow(page);
    });
  });

  // Fit is a function of the phone and the count: `densityFor` spends the slack a small count
  // leaves. Both phones are asserted, the small one being the width the tiers are sized against.
  for (const { name, viewport, hasTouch, fitsUpTo } of FIT_MATRIX) {
    test.describe(`make recipe - fit by recipe count - ${name}`, () => {
      test.use({ hasTouch });

      for (const count of [1, 2, 3, 4, 5]) {
        test(`${String(count)} recipes`, async ({ page }) => {
          await page.setViewportSize(viewport);
          await goToSharedLink(page, batchOfWidth(count));

          const overflow = await checklistOverflow(page);
          if (count <= fitsUpTo) expect(overflow).toBe(0);
          else expect(overflow).toBeGreaterThan(0);
        });
      }
    });
  }

  // The fallback the guarantee cannot cover: the small phone is ~55px narrower and still overflows
  // at the name cap, so only it earns a second shot revealing the last column; the tablet fits.
  test.describe("make recipe - four recipes, scrolled to the last column", () => {
    test.use({ hasTouch: VIEWPORT_MOBILE_SMALL_PORTRAIT.hasTouch });

    test("scrolled to the last column", async ({ page }) => {
      await page.setViewportSize(VIEWPORT_MOBILE_SMALL_PORTRAIT.viewport);
      await goToSharedLink(page, SHARED_BATCH_WIDE);

      await shootScrolledToLastColumn(page, "make-recipe-wide-scrolled-mobile-small-portrait.png");
    });
  });

  // A batch too wide to fit, where the frozen name column costs scroll viewport. Shot at the large
  // phone: unscrolled for how many recipes land on screen, then scrolled for the ones pushed off.
  test.describe("make recipe - five recipes", () => {
    test.use({ hasTouch: VIEWPORT_MOBILE_LARGE_PORTRAIT.hasTouch });

    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORT_MOBILE_LARGE_PORTRAIT.viewport);
      await goToSharedLink(page, SHARED_BATCH_SCROLLING);
      await expect(page.getByTestId("batch-progress")).toContainText("0 of 16 weighed");
    });

    test("five recipes", async ({ page }) => {
      await shootPage(page, "make-recipe-scrolling-mobile-large-portrait.png");
    });

    test("scrolled to the last column", async ({ page }) => {
      await shootScrolledToLastColumn(
        page,
        "make-recipe-scrolling-scrolled-mobile-large-portrait.png",
      );
    });
  });

  // The fourth is left unpicked: a partly colored batch is the normal state.
  test("make recipe - picked container colors", async ({ page }) => {
    await goToSharedLink(page, SHARED_BATCH_COLORED);
    await weighOffColoredCells(page);
    await shootPage(page, "make-recipe-colored.png");
  });

  // Dark mode is where the solid pair earns its keep, black especially: it must not vanish.
  test("make recipe - picked container colors - dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await goToSharedLink(page, SHARED_BATCH_COLORED);
    await weighOffColoredCells(page);
    await shootPage(page, "make-recipe-colored-dark.png");
  });

  test("make recipe - invalid link error", async ({ page }) => {
    await goToPageAndWaitFor(page, "/make-recipe#not-a-real-payload");
    await expect(page.getByTestId("make-recipe-error")).toBeVisible();
    await parkCursor(page);
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
