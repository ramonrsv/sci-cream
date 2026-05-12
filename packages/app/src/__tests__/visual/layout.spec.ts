import { test, expect } from "@playwright/test";

import { goToPageAndWaitFor } from "@/__tests__/e2e/util";
import { VIEWPORTS } from "@/__tests__/visual/assets";

test.describe("Visual Regression: Responsive Layout", () => {
  for (const { name, viewport, screenshot } of VIEWPORTS) {
    test(name, async ({ page }) => {
      await page.setViewportSize(viewport);

      await goToPageAndWaitFor(page);

      // Wait for any animations or dynamic content to settle
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot(`${screenshot}.png`, {
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
