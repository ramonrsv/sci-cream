import { test, expect } from "@playwright/test";

import { goToPageAndWaitFor } from "../e2e/util";
import { VIEWPORT_MOBILE_SMALL_PORTRAIT } from "./assets";

// Settled widths of the desktop sidebar: `SIDEBAR_W_RAIL_LG`'s `w-18` and `SIDEBAR_W_EXPANDED_LG`'s
// `w-58`. Hovering opens the peek over the same 200ms transition; pinning then keeps that width.
const DESKTOP_RAIL_WIDTH = "72px";
const DESKTOP_EXPANDED_WIDTH = "232px";

test.describe("Visual Regression: Rail and Expanded Sidebar", () => {
  test("rail sidebar", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const sidebar = page.locator("#sidebar");
    await expect(sidebar).toHaveCSS("width", DESKTOP_RAIL_WIDTH);

    await expect(sidebar).toHaveScreenshot("sidebar-rail.png");
  });

  test("expanded sidebar", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const sidebar = page.locator("#sidebar");
    await expect(sidebar).toHaveCSS("width", DESKTOP_RAIL_WIDTH);

    // Desktop: hover to reveal the toggle, then click it to pin the sidebar expanded.
    await page.locator("#sidebar").hover();
    await expect(sidebar).toHaveCSS("width", DESKTOP_EXPANDED_WIDTH);
    await page.locator("#pin-sidebar-button").click();
    await expect(page.locator("#pin-sidebar-button")).toHaveAttribute("title", "Unpin sidebar");

    await expect(sidebar).toHaveScreenshot("sidebar-expanded.png");
  });
});

test.describe("Visual Regression: Rail and Expanded Header", () => {
  test("rail header", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const header = page.locator("#header");
    await expect(header).toBeVisible();
    // The header's left band tracks the sidebar, so wait on the sidebar's settled width.
    await expect(page.locator("#sidebar")).toHaveCSS("width", DESKTOP_RAIL_WIDTH);

    await expect(header).toHaveScreenshot("header-rail.png");
  });

  test("expanded header", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const header = page.locator("#header");
    const sidebar = page.locator("#sidebar");
    await expect(header).toBeVisible();
    // The header's left band tracks the sidebar, so wait on the sidebar's settled width.
    await expect(sidebar).toHaveCSS("width", DESKTOP_RAIL_WIDTH);

    // Desktop: hover to reveal the toggle, then click it to pin the sidebar expanded.
    await sidebar.hover();
    await expect(sidebar).toHaveCSS("width", DESKTOP_EXPANDED_WIDTH);
    await page.locator("#pin-sidebar-button").click();
    await expect(page.locator("#pin-sidebar-button")).toHaveAttribute("title", "Unpin sidebar");

    await expect(header).toHaveScreenshot("header-expanded.png");
  });
});

// Settled widths of the mobile sidebar: `SIDEBAR_W_PEEK`'s `w-54` and `SIDEBAR_W_PINNED`'s `w-14`.
// Taps start a 200ms width transition; mid-flight they miss the button and shots lose subpixel AA.
const MOBILE_PEEK_WIDTH = "216px";
const MOBILE_RAIL_WIDTH = "56px";

test.describe("Visual Regression: Sidebar States, Mobile", () => {
  // Emulate touch so the header renders its hamburger, not the mouse hover-peek logo. `hasTouch`
  // alone flips `(hover)`/`(pointer)`; the visual project is Desktop Chrome (a mouse) otherwise.
  test.use({ hasTouch: VIEWPORT_MOBILE_SMALL_PORTRAIT.hasTouch });

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
    await expect(sidebar).toHaveCSS("width", MOBILE_PEEK_WIDTH);
    await page.locator("#pin-sidebar-button").click();
    await expect(sidebar).toHaveCSS("width", MOBILE_RAIL_WIDTH);

    await expect(sidebar).toHaveScreenshot("sidebar-rail-shrunk.png");
  });

  test("expanded sidebar", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const sidebar = page.locator("#sidebar");

    // Mobile: tap the hamburger to peek the drawer open.
    await page.locator("#peek-sidebar-button").click();
    await expect(sidebar).toHaveCSS("width", MOBILE_PEEK_WIDTH);

    await expect(sidebar).toHaveScreenshot("sidebar-expanded-shrunk.png");
  });
});
