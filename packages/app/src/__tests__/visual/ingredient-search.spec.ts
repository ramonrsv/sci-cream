import { test, expect, type Page } from "@playwright/test";

import { TEST_USER_B } from "@/lib/database/assets";
import { captureFullContent } from "@/__tests__/visual/util";
import {
  goToPageAndWaitFor,
  loginAsTestUserWithCredentials,
  selectIngredientByName,
} from "@/__tests__/e2e/util";

const INGREDIENTS_URL = "/ingredients";

/** Navigate to the ingredients page and wait for the WASM-backed search to be ready */
async function goToIngredientsPage(page: Page) {
  await goToPageAndWaitFor(page, INGREDIENTS_URL);
}

test.describe("Visual Regression: Ingredient Search", () => {
  test("empty state - no ingredient selected", async ({ page }) => {
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await goToIngredientsPage(page);

    await expect(page.locator(".search-empty")).toBeVisible();
    await expect(page.locator("#ingredient-search")).toHaveScreenshot(
      "ingredient-search-empty.png",
    );
  });

  test("ingredient selected", async ({ page }) => {
    await goToIngredientsPage(page);
    await selectIngredientByName(page, "Sucrose");

    await expect(page.locator("#ingredient-search")).toHaveScreenshot(
      "ingredient-search-selected.png",
    );

    await expect(page.locator(".search-list-item-active")).toBeVisible();
    await expect(page.locator(".search-list-item-active")).toHaveScreenshot(
      "ingredient-search-active-list-item.png",
    );
  });

  test("ingredient selected - detail panel with JSON spec and composition", async ({ page }) => {
    await goToIngredientsPage(page);
    await selectIngredientByName(page, "Sealtest 3.25% Milk");

    // No Load button on the read-only ingredients page
    await expect(page.getByRole("button", { name: "Load" })).toHaveCount(0);

    const detailPanel = page.locator(".search-detail-panel");
    // The 'comments' field is removed; the full text renders as a paragraph below
    await expect(detailPanel.locator("pre")).not.toContainText('"comments"');
    // The URL in the comments should be auto-linked
    await expect(detailPanel.getByRole("link")).toBeVisible();

    expect(await captureFullContent(page, "search-detail-panel")).toMatchSnapshot(
      `ingredient-search-detail-panel.png`,
    );
  });

  test("alias selected - 'Alias' badge in detail header", async ({ page }) => {
    await goToIngredientsPage(page);
    await selectIngredientByName(page, "Whole Milk");

    const detailPanel = page.locator(".search-detail-panel");
    // Use { exact: true } so the substring match doesn't also hit the JSON pre's
    // "alias": / "for": keys (Playwright's getByText is case-insensitive substring by default).
    await expect(detailPanel.getByText("Alias", { exact: true })).toBeVisible();
    await expect(detailPanel.getByText("Dairy", { exact: true })).toBeVisible();
    // The literal "alias for X" prose was removed in favour of the badge
    await expect(detailPanel.getByText(/alias for/i)).toHaveCount(0);

    await expect(detailPanel).toHaveScreenshot("ingredient-search-detail-panel-alias.png");
  });

  test("saved selected - shows 'saved' source badge", async ({ page }) => {
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await goToIngredientsPage(page);
    // Source-filter to Saved so we don't accidentally pick a built-in entry with the same name
    await page.getByRole("button", { name: "Saved" }).click();
    await selectIngredientByName(page, "Fructose (User-Defined)");

    const detailPanel = page.locator(".search-detail-panel");
    await expect(detailPanel.getByText("saved")).toBeVisible();

    await expect(detailPanel).toHaveScreenshot("ingredient-search-detail-panel-saved.png");
  });

  test("search query - filtered list", async ({ page }) => {
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await goToIngredientsPage(page);

    await page.locator('input[type="search"]').fill("Sucrose");

    await expect(page.locator("#ingredient-search")).toHaveScreenshot(
      "ingredient-search-query-some-results.png",
    );
  });

  test("search query - no results", async ({ page }) => {
    await goToIngredientsPage(page);

    await page.locator('input[type="search"]').fill("zzz-no-match");

    await expect(page.getByText("No ingredients found.")).toBeVisible();
    await expect(page.locator("#ingredient-search")).toHaveScreenshot(
      "ingredient-search-query-no-results.png",
    );
  });

  test("source filter - built-in only (user logged in)", async ({ page }) => {
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await goToIngredientsPage(page);

    await page.getByRole("button", { name: "Built-in" }).click();

    await expect(page.locator("#ingredient-search")).toHaveScreenshot(
      "ingredient-search-source-builtin.png",
    );
  });

  test("source filter - saved only (user logged in)", async ({ page }) => {
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await goToIngredientsPage(page);

    await page.getByRole("button", { name: "Saved" }).click();
    // TEST_USER_B is seeded with the user-defined Fructose spec
    await expect(page.getByText("Fructose (User-Defined)")).toBeVisible();

    await expect(page.locator("#ingredient-search")).toHaveScreenshot(
      "ingredient-search-source-saved.png",
    );
  });

  test("source filter - saved only (empty, user not logged in)", async ({ page }) => {
    await goToIngredientsPage(page);

    await page.getByRole("button", { name: "Saved" }).click();

    await expect(page.getByText("No ingredients found.")).toBeVisible();
    await expect(page.locator("#ingredient-search")).toHaveScreenshot(
      "ingredient-search-source-saved-empty.png",
    );
  });
});
