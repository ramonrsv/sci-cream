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

  test("built-in recipe with evaporation - table shows post-evaporation yield", async ({
    page,
  }) => {
    await goToRecipesPage(page);
    // Not logged in, so the built-in "Ice Cream Science: Chocolate Ice Cream" is the only match
    await selectRecipeByName(page, "Chocolate Ice Cream");

    await expect(page.getByTitle("Yield: final mix mass after evaporation")).toHaveText(/939 g/);
    await expect(page.getByTitle("Grams of water evaporated during preparation")).toContainText(
      "150",
    );

    await expect(page.locator(".search-detail-panel")).toBeVisible();
    await expect(page.locator(".search-detail-panel")).toHaveScreenshot(
      "recipe-search-evaporation-yield.png",
    );
  });

  test("saved recipe with long ingredient name - table truncates, layout intact", async ({
    page,
  }) => {
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await goToRecipesPage(page);
    await selectRecipeByName(page, "Recipe with Long Ingredient Name");

    await expect(page.locator(".search-detail-panel")).toBeVisible();
    await expect(page.locator(".search-detail-panel")).toHaveScreenshot(
      "recipe-search-long-ingredient-name.png",
    );
  });

  test("saved recipe - editable comments textarea pre-filled from seed", async ({ page }) => {
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await goToRecipesPage(page);
    // Source-filter to Saved so we don't accidentally pick a built-in with the same name
    await page.getByRole("button", { name: "Saved" }).click();
    await selectRecipeByName(page, "Chocolate Ice Cream");

    const textarea = page.getByLabel("Recipe comments");
    // Default-to-latest: the seeded v2 comments appear first
    await expect(textarea).toHaveValue(/Slightly sweeter/);
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

  test("saved recipe with excess evaporation - readout flagged, panel intact", async ({ page }) => {
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await goToRecipesPage(page);
    await page.getByRole("button", { name: "Saved" }).click();
    await selectRecipeByName(page, "Recipe with Excess Evaporation");

    // Invalid evaporation, so calculation fails: evap amount cell is fagged, error is in tooltip
    const readout = page.getByTitle(/Invalid evaporation/);
    await expect(readout).toContainText("500");
    await expect(readout).toHaveClass(/outline-red-400/);

    await expect(page.locator(".search-detail-panel")).toBeVisible();
    await expect(page.locator(".search-detail-panel")).toHaveScreenshot(
      "recipe-search-excess-evaporation.png",
    );
  });

  test("saved recipe with multiple versions - version selector in toolbar band", async ({
    page,
  }) => {
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await goToRecipesPage(page);
    await page.getByRole("button", { name: "Saved" }).click();
    await selectRecipeByName(page, "Chocolate Ice Cream");

    // Two seeded versions surface the version select in the table's toolbar, default latest v2
    const versionSelect = page.getByLabel("Recipe version");
    await expect(versionSelect).toBeVisible();

    await expect(page.locator(".search-detail-panel")).toHaveScreenshot(
      "recipe-search-multiple-versions.png",
    );
  });

  test("saved recipe - version details popup pre-filled from the selected version", async ({
    page,
  }) => {
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await goToRecipesPage(page);
    await page.getByRole("button", { name: "Saved" }).click();
    await selectRecipeByName(page, "Chocolate Ice Cream");

    await page.getByLabel("Edit version details").click();

    // The popup (portaled, so captured on its own) seeds from the latest version
    const popup = page.locator(".popup");
    await expect(popup.getByLabel("Version label")).toHaveValue("sweeter tweak");
    await expect(popup.getByRole("button", { name: "Save details" })).toBeVisible();

    await expect(popup).toHaveScreenshot("recipe-search-version-details-popup.png");
  });
});
