import { test, expect } from "@playwright/test";

import { KeyFilter } from "@/lib/ui/key-filter-select";

import {
  getIngredientNameInputAtIdx,
  getMixPropertiesKeyFilterSelectInput,
  pasteRecipeAndWaitForUpdate,
} from "@/__tests__/e2e/util";

import { RecipeID } from "@/__tests__/assets";

test.describe("Visual Regression: Empty State", () => {
  test("initial page load - empty recipe grid", async ({ page }) => {
    await page.goto("");
    await page.waitForLoadState("networkidle");

    const recipeGrid = page.locator("#recipe-grid");
    await expect(recipeGrid).toBeVisible();

    await expect(recipeGrid).toHaveScreenshot("recipe-grid-empty.png");
  });

  test("empty properties grid", async ({ page }) => {
    await page.goto("");
    await page.waitForLoadState("networkidle");

    const propertiesGrid = page.locator("#mix-properties-grid");
    await expect(propertiesGrid).toBeVisible();

    await expect(propertiesGrid).toHaveScreenshot("properties-grid-empty.png");
  });

  test("empty composition grid", async ({ page }) => {
    await page.goto("");
    await page.waitForLoadState("networkidle");

    const compositionGrid = page.locator("#ing-composition-grid");
    await expect(compositionGrid).toBeVisible();

    await expect(compositionGrid).toHaveScreenshot("composition-grid-empty.png");
  });

  test("empty properties chart", async ({ page }) => {
    await page.goto("");
    await page.waitForLoadState("networkidle");

    const propertiesChart = page.locator("#mix-properties-chart");
    await expect(propertiesChart).toBeVisible();

    await expect(propertiesChart).toHaveScreenshot("properties-chart-empty.png");
  });

  test("empty FPD graph", async ({ page }) => {
    await page.goto("");
    await page.waitForLoadState("networkidle");

    const fpdGraph = page.locator("#fpd-graph");
    await expect(fpdGraph).toBeVisible();

    await expect(fpdGraph).toHaveScreenshot("fpd-graph-empty.png");
  });
});

test.describe("Visual Regression: Main Recipe Populated", () => {
  test("recipe grid with reference ice cream recipe", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    await page.goto("");
    await page.waitForLoadState("networkidle");

    await pasteRecipeAndWaitForUpdate(page, browserName, RecipeID.Main);

    const recipeGrid = page.locator("#recipe-grid");
    await expect(recipeGrid).toHaveScreenshot("recipe-grid-populated.png");
  });

  test("properties grid with calculated values", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    await page.goto("");
    await page.waitForLoadState("networkidle");

    await pasteRecipeAndWaitForUpdate(page, browserName, RecipeID.Main);

    const propertiesGrid = page.locator("#mix-properties-grid");
    await expect(propertiesGrid).toBeVisible();
    await propertiesGrid.locator("div").nth(1).scrollIntoViewIfNeeded();
    await expect(propertiesGrid).toHaveScreenshot("properties-grid-populated.png");
  });

  test("composition grid with calculated values", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    await page.goto("");
    await page.waitForLoadState("networkidle");

    await pasteRecipeAndWaitForUpdate(page, browserName, RecipeID.Main);

    const compositionGrid = page.locator("#ing-composition-grid");
    await expect(compositionGrid).toBeVisible();
    await compositionGrid.locator("div").nth(1).scrollIntoViewIfNeeded();
    await expect(compositionGrid).toHaveScreenshot("composition-grid-populated.png");
  });

  test("properties chart with reference ice cream data", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    await page.goto("");
    await page.waitForLoadState("networkidle");

    await pasteRecipeAndWaitForUpdate(page, browserName, RecipeID.Main);

    // Wait for chart to finish rendering after data update
    await page.waitForTimeout(500);

    const propertiesChart = page.locator("#mix-properties-chart");
    await expect(propertiesChart).toBeVisible();
    await expect(propertiesChart).toHaveScreenshot("properties-chart-populated.png");
  });

  test("FPD graph with reference ice cream data", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    await page.goto("");
    await page.waitForLoadState("networkidle");

    await pasteRecipeAndWaitForUpdate(page, browserName, RecipeID.Main);

    // Wait for chart to finish rendering after data update
    await page.waitForTimeout(500);

    const fpdGraph = page.locator("#fpd-graph");
    await expect(fpdGraph).toBeVisible();
    await expect(fpdGraph).toHaveScreenshot("fpd-graph-populated.png");
  });
});

test.describe("Visual Regression: Interactive States", () => {
  test("valid ingredient input focused", async ({ page }) => {
    await page.goto("");
    await page.waitForLoadState("networkidle");

    const nameInput = getIngredientNameInputAtIdx(page, 0);
    await nameInput.click();
    await nameInput.fill("Milk");
    await expect(nameInput).toHaveValue("Milk");

    await expect(nameInput).toHaveScreenshot("ingredient-input-valid-focused.png");
  });

  test("invalid ingredient input focused", async ({ page }) => {
    await page.goto("");
    await page.waitForLoadState("networkidle");

    const nameInput = getIngredientNameInputAtIdx(page, 0);
    await nameInput.click();
    await nameInput.fill("Invalid Ingredient");
    await expect(nameInput).toHaveValue("Invalid Ingredient");

    await expect(nameInput).toHaveScreenshot("ingredient-input-invalid-focused.png");
  });

  test("invalid ingredient input unfocused", async ({ page }) => {
    await page.goto("");
    await page.waitForLoadState("networkidle");

    const nameInput = getIngredientNameInputAtIdx(page, 0);
    await nameInput.click();
    await nameInput.fill("Invalid Ingredient");
    await page.click("body");
    await expect(nameInput).toHaveValue("Invalid Ingredient");

    await expect(nameInput).toHaveScreenshot("ingredient-input-invalid-unfocused.png");
  });
});

test.describe("Visual Regression: Component Variations", () => {
  test("properties grid - scrolled state", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    await page.goto("");
    await page.waitForLoadState("networkidle");

    await pasteRecipeAndWaitForUpdate(page, browserName, RecipeID.Main);

    const keyFilter = getMixPropertiesKeyFilterSelectInput(page);
    await keyFilter.selectOption(KeyFilter.All);

    const propertiesGrid = page.locator("#mix-properties-grid");

    // Target the scrollable container with overflow-y-auto class
    const scrollableDiv = propertiesGrid.locator("div.overflow-y-auto");
    // Scroll to middle of properties list
    await scrollableDiv.evaluate((el) => (el.scrollTop = el.scrollHeight / 2));
    await page.waitForTimeout(200);

    await expect(propertiesGrid).toHaveScreenshot("properties-grid-scrolled.png");
  });
});
