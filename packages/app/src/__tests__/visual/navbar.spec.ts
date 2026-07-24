import { test, expect } from "@playwright/test";

import { goToPageAndWaitFor } from "../e2e/util";
import { VIEWPORT_MOBILE_SMALL_PORTRAIT } from "./assets";

test.describe("Visual Regression: Rail and Expanded Sidebar", () => {
  test("rail sidebar", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const sidebar = page.locator("#sidebar");
    await expect(sidebar).toBeVisible();

    await expect(sidebar).toHaveScreenshot("sidebar-rail.png");
  });

  test("expanded sidebar", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const sidebar = page.locator("#sidebar");
    await expect(sidebar).toBeVisible();

    // Desktop: hover to reveal the toggle, then click it to pin the sidebar expanded.
    await page.locator("#sidebar").hover();
    await page.locator("#pin-sidebar-button").click();
    await expect(page.locator("#pin-sidebar-button")).toBeVisible();

    await expect(sidebar).toHaveScreenshot("sidebar-expanded.png");
  });
});

test.describe("Visual Regression: Rail and Expanded Header", () => {
  test("rail header", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const header = page.locator("#header");
    await expect(header).toBeVisible();

    await expect(header).toHaveScreenshot("header-rail.png");
  });

  test("expanded header", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const header = page.locator("#header");
    await expect(header).toBeVisible();

    // Desktop: hover to reveal the toggle, then click it to pin the sidebar expanded.
    await page.locator("#sidebar").hover();
    await page.locator("#pin-sidebar-button").click();
    await expect(page.locator("#pin-sidebar-button")).toBeVisible();

    await expect(header).toHaveScreenshot("header-expanded.png");
  });
});

test.describe("Visual Regression: Sidebar States, Mobile", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORT_MOBILE_SMALL_PORTRAIT.viewport);
  });

  test("hidden sidebar", async ({ page }) => {
    await goToPageAndWaitFor(page);

    // On mobile the unpinned sidebar is hidden (w-0), so there is nothing to screenshot.
    await expect(page.locator("#sidebar")).toHaveCSS("width", "0px");
  });

  test("rail sidebar", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const sidebar = page.locator("#sidebar");

    // Pin the rail: open the drawer, then tap the toggle (which also closes the peek on mobile).
    await page.locator("#peek-sidebar-button").click();
    await page.locator("#pin-sidebar-button").click();
    await expect(sidebar).toBeVisible();

    await expect(sidebar).toHaveScreenshot("sidebar-rail-shrunk.png");
  });

  test("expanded sidebar", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const sidebar = page.locator("#sidebar");

    // Mobile: tap the hamburger to peek the drawer open.
    await page.locator("#peek-sidebar-button").click();
    await expect(sidebar).toBeVisible();

    await expect(sidebar).toHaveScreenshot("sidebar-expanded-shrunk.png");
  });
});
