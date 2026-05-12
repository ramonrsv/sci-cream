import { test, expect } from "@playwright/test";

import { goToPageAndWaitFor, selectRecipeByName } from "@/__tests__/e2e/util";
import { VIEWPORTS } from "@/__tests__/visual/assets";

/** Waits for a short period to allow any layout shifts or animations to complete. */
function waitForLayoutStability() {
  return new Promise((resolve) => setTimeout(resolve, 300));
}

test.describe("Visual Regression: Responsive Layout, calculator page", () => {
  for (const { name, viewport, screenshot } of VIEWPORTS) {
    test(name, async ({ page }) => {
      await page.setViewportSize(viewport);

      await goToPageAndWaitFor(page, "/calculator");
      await waitForLayoutStability();

      await expect(page).toHaveScreenshot(`calculator-${screenshot}.png`, {
        fullPage: true,
        // Allow a small pixel difference to account for anti-aliasing and rendering variations,
        // particularly on large viewports. This causes some of these tests to fail to catch minor
        // component changes, but it's necessary to prevent false positives in layout tests, and
        // other component-level visual regression tests should catch those minor component changes.
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});

test.describe("Visual Regression: Responsive Layout, recipes page", () => {
  for (const { name, viewport, screenshot } of VIEWPORTS) {
    test(name, async ({ page }) => {
      await page.setViewportSize(viewport);

      await goToPageAndWaitFor(page, "/recipes");
      await selectRecipeByName(page, "Standard Base");
      await waitForLayoutStability();

      await expect(page).toHaveScreenshot(`recipes-${screenshot}.png`, { fullPage: true });
    });
  }
});

test.describe("Visual Regression: Responsive Layout, blog post", () => {
  for (const { name, viewport, screenshot } of VIEWPORTS) {
    test(name, async ({ page }) => {
      await page.setViewportSize(viewport);

      await goToPageAndWaitFor(page, "/blog/2026-04-27-welcome");
      await waitForLayoutStability();

      await expect(page).toHaveScreenshot(`blog-post-${screenshot}.png`, { fullPage: true });
    });
  }
});
