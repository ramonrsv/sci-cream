import { test, expect, type Page } from "@playwright/test";

import { goToPageAndWaitFor, loginAsTestUserWithCredentials } from "@/__tests__/e2e/util";
import { TEST_USER_B } from "@/lib/database/util";
import { VIEWPORT_MOBILE_PORTRAIT } from "./assets";

const RECIPES_URL = "/recipes";

/** Navigate to the recipes page and wait for the WASM-backed search to be ready */
async function goToRecipesPage(page: Page) {
  await goToPageAndWaitFor(page, RECIPES_URL);
}

/** Click the first recipe in the list and wait for the detail panel to appear */
async function selectFirstRecipe(page: Page) {
  await page.locator(".search-list-item").first().click();
  await expect(page.locator(".search-detail-panel")).toBeVisible();
}

test.describe("Visual Regression: Recipe Search", () => {
  test("empty state - no recipe selected", async ({ page }) => {
    await goToRecipesPage(page);

    await expect(page.locator(".search-empty")).toBeVisible();
    await expect(page.locator("#recipe-search")).toHaveScreenshot("recipe-search-empty.png");
  });

  test("recipe selected - detail panel with table and mix properties", async ({ page }) => {
    await goToRecipesPage(page);
    await selectFirstRecipe(page);

    await expect(page.locator("#recipe-search")).toHaveScreenshot("recipe-search-selected.png");
  });

  test("recipe selected - slot selector and load button visible", async ({ page }) => {
    await goToRecipesPage(page);
    await selectFirstRecipe(page);

    // Slot selector and Load button are rendered by the recipes page (onLoadRecipe + slots=[0,1,2])
    await expect(
      page.getByRole("button", { name: "Load" }).locator("..").locator("select"),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Load" })).toBeVisible();
    await expect(page.locator(".search-detail-panel")).toHaveScreenshot(
      "recipe-search-detail-panel.png",
    );
  });

  test("search query - filtered list", async ({ page }) => {
    await goToRecipesPage(page);

    await page.locator('input[type="search"]').fill("Standard Base");

    await expect(page.locator("#recipe-search")).toHaveScreenshot(
      "recipe-search-query-some-results.png",
    );
  });

  test("search query - no results", async ({ page }) => {
    await goToRecipesPage(page);

    await page.locator('input[type="search"]').fill("zzz-no-match");

    await expect(page.getByText("No recipes found.")).toBeVisible();
    await expect(page.locator("#recipe-search")).toHaveScreenshot("recipe-search-no-results.png");
  });

  test("source filter - built-in only", async ({ page }) => {
    await goToRecipesPage(page);

    await page.getByRole("button", { name: "Built-in" }).click();

    await expect(page.locator("#recipe-search")).toHaveScreenshot(
      "recipe-search-source-builtin.png",
    );
  });

  test("source filter - saved only (empty, user not logged in)", async ({ page }) => {
    await goToRecipesPage(page);

    await page.getByRole("button", { name: "Saved" }).click();

    await expect(page.getByText("No recipes found.")).toBeVisible();
    await expect(page.locator("#recipe-search")).toHaveScreenshot(
      "recipe-search-source-saved-empty.png",
    );
  });

  test("active recipe highlighted in list", async ({ page }) => {
    await goToRecipesPage(page);
    await selectFirstRecipe(page);

    await expect(page.locator(".search-list-item-active")).toBeVisible();
    await expect(page.locator(".search-list-item-active")).toHaveScreenshot(
      "recipe-search-active-list-item.png",
    );
  });

  test("mobile viewport - empty state", async ({ page }) => {
    await page.setViewportSize(VIEWPORT_MOBILE_PORTRAIT.viewport);
    await goToRecipesPage(page);

    await expect(page.locator(".search-empty")).toBeVisible();
    await expect(page.locator("#recipe-search")).toHaveScreenshot("recipe-search-mobile-empty.png");
  });

  test("mobile viewport - recipe selected", async ({ page }) => {
    await page.setViewportSize(VIEWPORT_MOBILE_PORTRAIT.viewport);
    await goToRecipesPage(page);
    await selectFirstRecipe(page);

    await expect(page.locator("#recipe-search")).toHaveScreenshot(
      "recipe-search-mobile-selected.png",
    );
  });

  test("saved recipe with invalid ingredient - cell highlighted red", async ({ page }) => {
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await goToRecipesPage(page);
    await page.getByRole("button", { name: "Saved" }).click();
    await page.locator(".search-list-item").first().click();
    await expect(page.locator(".search-detail-panel")).toBeVisible();

    await expect(page.locator(".search-detail-panel")).toHaveScreenshot(
      "recipe-search-saved-invalid-ingredient.png",
    );
  });
});
