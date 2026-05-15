import { test, expect, Page } from "@playwright/test";

import {
  goToPageAndWaitFor,
  selectIngredientByName,
  selectRecipeByName,
} from "@/__tests__/e2e/util";

import { VIEWPORTS } from "@/__tests__/visual/assets";
import { setViewportHeightForAllContentScreenshot } from "@/__tests__/visual/util";

/** Waits for a short period to allow any layout shifts or animations to complete. */
function waitForLayoutStability() {
  return new Promise((resolve) => setTimeout(resolve, 300));
}

/** Takes screenshots of the viewport and the full content of a page. */
async function takeViewportAndFullContentScreenshots(
  page: Page,
  viewport: { width: number; height: number },
  screenshot: string,
  pageSetup: (page: Page) => Promise<void>,
  maxDiffPixelRatio?: number,
) {
  await page.setViewportSize(viewport);

  await pageSetup(page);
  await waitForLayoutStability();
  await expect(page).toHaveScreenshot(`${screenshot}.png`, { maxDiffPixelRatio });

  await setViewportHeightForAllContentScreenshot(page);
  await pageSetup(page);
  await waitForLayoutStability();
  await expect(page).toHaveScreenshot(`${screenshot}-all-content.png`, { maxDiffPixelRatio });
}

test.describe("Visual Regression: Responsive Layout, calculator page", () => {
  // Allow a small pixel difference to account for anti-aliasing and rendering variations,
  // particularly on large viewports. This causes some of these tests to fail to catch minor
  // component changes, but it's necessary to prevent false positives in layout tests, and
  // other component-level visual regression tests should catch those minor component changes.
  const maxDiffPixelRatio = 0.01; // Allow up to 1% of pixels to differ

  for (const { name, viewport, screenshot } of VIEWPORTS) {
    test(name, async ({ page }) => {
      await takeViewportAndFullContentScreenshots(
        page,
        viewport,
        `calculator-${screenshot}`,
        async (page) => await goToPageAndWaitFor(page, "/calculator"),
        maxDiffPixelRatio,
      );
    });
  }
});

test.describe("Visual Regression: Responsive Layout, recipes page", () => {
  for (const { name, viewport, screenshot } of VIEWPORTS) {
    test(name, async ({ page }) => {
      await takeViewportAndFullContentScreenshots(
        page,
        viewport,
        `recipes-${screenshot}`,
        async (page) => {
          await goToPageAndWaitFor(page, "/recipes");
          await selectRecipeByName(page, "Standard Base");
        },
      );
    });
  }
});

test.describe("Visual Regression: Responsive Layout, ingredients page", () => {
  for (const { name, viewport, screenshot } of VIEWPORTS) {
    test(name, async ({ page }) => {
      await takeViewportAndFullContentScreenshots(
        page,
        viewport,
        `ingredients-${screenshot}`,
        async (page) => {
          await goToPageAndWaitFor(page, "/ingredients");
          await selectIngredientByName(page, "Sealtest 3.25% Milk");
        },
      );
    });
  }
});

test.describe("Visual Regression: Responsive Layout, blog post", () => {
  for (const { name, viewport, screenshot } of VIEWPORTS) {
    test(name, async ({ page }) => {
      await takeViewportAndFullContentScreenshots(
        page,
        viewport,
        `blog-post-${screenshot}`,
        async (page) => await goToPageAndWaitFor(page, "/blog/2026-04-27-welcome"),
      );
    });
  }
});
