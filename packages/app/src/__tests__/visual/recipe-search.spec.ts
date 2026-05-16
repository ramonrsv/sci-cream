import { test, expect, type Page } from "@playwright/test";

import { TEST_USER_B } from "@/lib/database/assets";
import {
  goToPageAndWaitFor,
  loginAsTestUserWithCredentials,
  selectRecipeByName,
} from "@/__tests__/e2e/util";
import { captureFullContent } from "./util";

const RECIPES_URL = "/recipes";

/** Navigate to the recipes page and wait for the WASM-backed search to be ready */
async function goToRecipesPage(page: Page) {
  await goToPageAndWaitFor(page, RECIPES_URL);
}

test.describe("Visual Regression: Recipe Search", () => {
  test("empty state - no recipe selected", async ({ page }) => {
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await goToRecipesPage(page);

    await expect(page.locator(".search-empty")).toBeVisible();
    await expect(page.locator("#recipe-search")).toHaveScreenshot("recipe-search-empty.png");
  });

  test("recipe selected", async ({ page }) => {
    await goToRecipesPage(page);
    await selectRecipeByName(page, "Standard Base");

    await expect(page.locator("#recipe-search")).toHaveScreenshot("recipe-search-selected.png");

    await expect(page.locator(".search-list-item-active")).toBeVisible();
    await expect(page.locator(".search-list-item-active")).toHaveScreenshot(
      "recipe-search-active-list-item.png",
    );
  });

  test("recipe selected - detail panel with table and mix properties", async ({ page }) => {
    await goToRecipesPage(page);
    await selectRecipeByName(page, "Standard Base");

    // Slot selector and Load button are rendered by the recipes page (onLoadRecipe + slots=[0,1,2])
    await expect(page.getByRole("button", { name: "Load" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Load" }).locator("..").locator("select"),
    ).toBeVisible();

    expect(await captureFullContent(page, "search-detail-panel")).toMatchSnapshot(
      `recipe-search-detail-panel.png`,
    );
  });

  test("search query - filtered list", async ({ page }) => {
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
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
    await expect(page.locator("#recipe-search")).toHaveScreenshot(
      "recipe-search-query-no-results.png",
    );
  });

  test("source filter - built-in only (user logged in)", async ({ page }) => {
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await goToRecipesPage(page);

    await page.getByRole("button", { name: "Built-in" }).click();

    await expect(page.locator("#recipe-search")).toHaveScreenshot(
      "recipe-search-source-builtin.png",
    );
  });

  test("source filter - saved only (user logged in)", async ({ page }) => {
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await goToRecipesPage(page);

    await page.getByRole("button", { name: "Saved" }).click();
    await expect(page.locator("#recipe-search")).toHaveScreenshot("recipe-search-source-saved.png");
  });

  test("source filter - saved only (empty, user not logged in)", async ({ page }) => {
    await goToRecipesPage(page);

    await page.getByRole("button", { name: "Saved" }).click();

    await expect(page.getByText("No recipes found.")).toBeVisible();
    await expect(page.locator("#recipe-search")).toHaveScreenshot(
      "recipe-search-source-saved-empty.png",
    );
  });

  test("saved recipe with invalid ingredient - cell highlighted red", async ({ page }) => {
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await goToRecipesPage(page);
    await selectRecipeByName(page, "Recipe with Invalid Ingredients");

    await expect(page.locator(".search-detail-panel")).toBeVisible();
    await expect(page.locator(".search-detail-panel")).toHaveScreenshot(
      "recipe-search-invalid-ingredient.png",
    );
  });

  test("saved recipe - editable comments textarea pre-filled from seed", async ({ page }) => {
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await goToRecipesPage(page);
    // Source-filter to Saved so we don't accidentally pick a built-in with the same name
    await page.getByRole("button", { name: "Saved" }).click();
    await selectRecipeByName(page, "Chocolate Ice Cream");

    const textarea = page.getByLabel("Recipe comments");
    await expect(textarea).toHaveValue(/Rich, dark, and bittersweet/);
    await expect(page.getByRole("button", { name: "Save comments" })).toBeAttached();

    textarea.scrollIntoViewIfNeeded();
    await expect(page.locator(".search-detail-panel")).toHaveScreenshot(
      "recipe-search-saved-comments-prefilled.png",
    );
  });

  test("saved recipe - editable comments textarea empty (placeholder visible)", async ({
    page,
  }) => {
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await goToRecipesPage(page);
    await page.getByRole("button", { name: "Saved" }).click();
    await selectRecipeByName(page, "Sugar-Free Base");

    const textarea = page.getByLabel("Recipe comments");
    await expect(textarea).toHaveValue("");
    await expect(page.getByRole("button", { name: "Save comments" })).toBeAttached();

    await textarea.scrollIntoViewIfNeeded();
    await expect(page.locator(".search-detail-panel")).toHaveScreenshot(
      "recipe-search-saved-comments-empty.png",
    );
  });

  test("saved recipe - typed comments shown in textarea (dirty state)", async ({ page }) => {
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await goToRecipesPage(page);
    await page.getByRole("button", { name: "Saved" }).click();
    await selectRecipeByName(page, "Sugar-Free Base");

    const textarea = page.getByLabel("Recipe comments");
    await textarea.fill("Try with 70% cocoa.");
    await expect(textarea).toHaveValue("Try with 70% cocoa.");

    await textarea.scrollIntoViewIfNeeded();
    await expect(page.locator(".search-detail-panel")).toHaveScreenshot(
      "recipe-search-saved-comments-edited.png",
    );
  });
});
