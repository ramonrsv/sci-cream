import { test, expect } from "@playwright/test";

test.describe("Visual Regression: Collapsed and Expanded Sidebar", () => {
  test("collapsed sidebar", async ({ page }) => {
    await page.goto("");
    await page.waitForLoadState("networkidle");

    const sidebar = page.locator("#sidebar");
    await expect(sidebar).toBeVisible();

    await expect(sidebar).toHaveScreenshot("sidebar-collapsed.png");
  });

  test("expanded sidebar", async ({ page }) => {
    await page.goto("");
    await page.waitForLoadState("networkidle");

    const sidebar = page.locator("#sidebar");
    await expect(sidebar).toBeVisible();

    const expandButton = page.locator("#expand-sidebar-button");
    await expandButton.click();

    await expect(sidebar).toHaveScreenshot("sidebar-expanded.png");
  });
});

test.describe("Visual Regression: Collapsed and Expanded Header", () => {
  test("collapsed header", async ({ page }) => {
    await page.goto("");
    await page.waitForLoadState("networkidle");

    const header = page.locator("#header");
    await expect(header).toBeVisible();

    await expect(header).toHaveScreenshot("header-collapsed.png");
  });

  test("expanded header", async ({ page }) => {
    await page.goto("");
    await page.waitForLoadState("networkidle");

    const header = page.locator("#header");
    await expect(header).toBeVisible();

    const expandButton = page.locator("#expand-sidebar-button");
    await expandButton.click();

    await expect(header).toHaveScreenshot("header-expanded.png");
  });
});

test.describe("Visual Regression: Collapsed and Expanded Sidebar, Shrunk", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 720 });
  });

  test("collapsed sidebar", async ({ page }) => {
    await page.goto("");
    await page.waitForLoadState("networkidle");

    const sidebar = page.locator("#sidebar");
    await expect(sidebar).toBeVisible();

    await expect(sidebar).toHaveScreenshot("sidebar-collapsed-shrunk.png");
  });

  test("expanded sidebar", async ({ page }) => {
    await page.goto("");
    await page.waitForLoadState("networkidle");

    const sidebar = page.locator("#sidebar");
    await expect(sidebar).toBeVisible();

    const expandButton = page.locator("#expand-sidebar-button");
    await expandButton.click();

    await expect(sidebar).toHaveScreenshot("sidebar-expanded-shrunk.png");
  });
});
