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
