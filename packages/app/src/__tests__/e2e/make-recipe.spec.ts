import { test, expect, type Page } from "@playwright/test";

import { goToPageAndWaitFor } from "@/__tests__/e2e/util";
import type { Batch } from "@/lib/batch/batch";
import { encodeBatchPayload, makeBatchPayload } from "@/lib/batch/batch-share";
import { STORAGE_KEYS } from "@/lib/local-storage";

/** Two recipes sharing "Sucrose", so the merged row and per-recipe cells are always exercised. */
const BATCH: Batch = {
  title: "Test batch",
  date: "2026-07-18",
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

/** Build a `/make-recipe#<payload>` URL (relative to baseURL) for the given batch. */
async function makeBatchLink(batch: Batch): Promise<string> {
  return `/make-recipe#${await encodeBatchPayload(makeBatchPayload(batch))}`;
}

/** Seed the calculator slots so owner mode has sources to offer. */
async function seedCalculatorSlots(page: Page) {
  await page.addInitScript(
    ([key, stores]) => {
      window.localStorage.setItem(key as string, JSON.stringify(stores));
    },
    [
      STORAGE_KEYS.recipeStores,
      [
        { name: "Strawberry Sorbet", serializedRows: "Strawberry\t300\nSucrose\t100" },
        { name: "Vanilla Base", serializedRows: "Whole Milk\t500\nSucrose\t120" },
        { name: "", serializedRows: "" },
      ],
    ],
  );
}

/**
 * Assert the first recipe's cell is painted white, not merely marked solid. Both values need a
 * browser: a dropped fill or a missing ink token fails nothing, it just renders wrong.
 */
async function expectWhiteFill(page: Page) {
  const cell = page.getByTestId("checklist-cell-0-Sucrose");
  await expect(cell).toHaveClass(/cat-solid/);
  await expect(cell).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(cell).toHaveCSS("color", "rgb(25, 25, 23)");
}

test.describe("Make-Recipe Checklist", () => {
  test("owner builds a merged checklist from two calculator slots", async ({ page }) => {
    await seedCalculatorSlots(page);
    await goToPageAndWaitFor(page, "/make-recipe");

    await expect(page.getByTestId("share-batch-button")).toBeDisabled();

    await page.getByTestId("batch-add-recipe").selectOption("slot:0");
    await page.getByTestId("batch-add-recipe").selectOption("slot:1");

    // The shared ingredient merges into one row carrying the summed total and both recipes' cells
    await expect(page.getByTestId("checklist-total-Sucrose")).toHaveText("220");
    await expect(page.getByTestId("checklist-cell-0-Sucrose")).toHaveText("100");
    await expect(page.getByTestId("checklist-cell-1-Sucrose")).toHaveText("120");

    // Letter badges distinguish the recipes without relying on color alone
    await expect(page.getByTestId("recipe-badge-0").first()).toHaveText("A");
    await expect(page.getByTestId("recipe-badge-1").first()).toHaveText("B");

    await expect(page.getByTestId("batch-progress")).toContainText("0 of 4 weighed");
    await expect(page.getByTestId("share-batch-button")).toBeEnabled();
  });

  test("a container color the owner picks rides the link to the recipient", async ({ page }) => {
    await seedCalculatorSlots(page);
    await goToPageAndWaitFor(page, "/make-recipe");
    await page.getByTestId("batch-add-recipe").selectOption("slot:0");

    // White is the case that proves color is data: it is never assigned by position, and it is
    // painted solid rather than tinted, so both facts have to survive the round trip.
    await page.getByTestId("builder-color-button").click();
    await page.getByTestId("builder-color-White").click();
    await expectWhiteFill(page);

    await page.getByTestId("share-batch-button").click();
    const link = page.getByTestId("batch-share-link");
    await expect(link).toHaveValue(/\/make-recipe#.+/);

    await goToPageAndWaitFor(page, await link.inputValue());
    await expectWhiteFill(page);
  });

  test("the shared link shows the same checklist to a recipient with no account", async ({
    browser,
  }) => {
    // A fresh context has no auth and no localStorage — the helper's own device
    const context = await browser.newContext();
    const page = await context.newPage();
    await goToPageAndWaitFor(page, await makeBatchLink(BATCH));

    await expect(page.getByRole("heading", { name: "Test batch" })).toBeVisible();
    await expect(page.getByText("shared checklist")).toBeVisible();
    await expect(page.getByTestId("checklist-total-Sucrose")).toHaveText("220");
    await expect(page.getByTestId("batch-progress")).toContainText("0 of 4 weighed");

    // A recipient cannot edit the batch or reshare it
    await expect(page.getByTestId("batch-builder")).toBeHidden();
    await expect(page.getByTestId("share-batch-button")).toBeHidden();

    await context.close();
  });

  test("checkoff persists across a reload on the recipient's device", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const link = await makeBatchLink(BATCH);
    await goToPageAndWaitFor(page, link);

    await page.getByTestId("checklist-cell-1-Whole Milk").click();
    await expect(page.getByTestId("batch-progress")).toContainText("1 of 4 weighed");

    await page.reload();
    await expect(page.getByTestId("checklist-cell-1-Whole Milk")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.getByTestId("batch-progress")).toContainText("1 of 4 weighed");

    await context.close();
  });

  test("a row is done only once every contributing recipe's cell is checked", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await goToPageAndWaitFor(page, await makeBatchLink(BATCH));

    const sucrose = page.getByTestId("checklist-row-Sucrose");
    await page.getByTestId("checklist-cell-0-Sucrose").click();
    await expect(sucrose).toHaveAttribute("data-done", "false");

    await page.getByTestId("checklist-cell-1-Sucrose").click();
    await expect(sucrose).toHaveAttribute("data-done", "true");

    await context.close();
  });

  test("a different batch does not inherit another batch's checkoff state", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await goToPageAndWaitFor(page, await makeBatchLink(BATCH));
    await page.getByTestId("checklist-cell-0-Sucrose").click();
    await expect(page.getByTestId("batch-progress")).toContainText("1 of 4 weighed");

    // Same ingredients, different amounts — a different thing to weigh, so progress starts fresh
    const other: Batch = {
      ...BATCH,
      recipes: [{ name: "Strawberry Sorbet", rows: [["Sucrose", 999]] }],
    };
    await goToPageAndWaitFor(page, await makeBatchLink(other));
    await expect(page.getByTestId("checklist-cell-0-Sucrose")).toHaveAttribute(
      "aria-checked",
      "false",
    );

    await context.close();
  });

  test("an invalid link shows a checklist-specific error and no partial checklist", async ({
    page,
  }) => {
    await goToPageAndWaitFor(page, "/make-recipe#not-a-real-payload");

    await expect(page.getByTestId("make-recipe-error")).toContainText("checklist link");
    await expect(page.getByTestId("batch-checklist")).toBeHidden();
    await expect(page.getByTestId("batch-builder")).toBeHidden();
  });

  test("the share dialog exposes a copyable link that round-trips", async ({ page }) => {
    await seedCalculatorSlots(page);
    await goToPageAndWaitFor(page, "/make-recipe");
    await page.getByTestId("batch-add-recipe").selectOption("slot:0");

    await page.getByTestId("share-batch-button").click();
    const link = page.getByTestId("batch-share-link");
    await expect(link).toHaveValue(/\/make-recipe#.+/);

    // The generated link renders the same amounts it was built from
    await goToPageAndWaitFor(page, await link.inputValue());
    await expect(page.getByTestId("checklist-cell-0-Strawberry")).toHaveText("300");
  });
});
