import { test, expect, Page } from "@playwright/test";

import {
  goToPageAndWaitFor,
  selectIngredientByName,
  selectRecipeByName,
} from "@/__tests__/e2e/util";

import { VIEWPORTS, VIEWPORT_DESKTOP_DEFAULT } from "@/__tests__/visual/assets";
import {
  captureFullContent,
  getContentOverflow,
  setViewportHeightForAllContentScreenshot,
} from "@/__tests__/visual/util";

/** Waits for a short period to allow any layout shifts or animations to complete. */
function waitForLayoutStability() {
  return new Promise((resolve) => setTimeout(resolve, 300));
}

/**
 * Takes screenshots of the viewport and the full content of a page.
 *
 * The `fullContent` strategy controls how the full-content screenshot is captured:
 * - `"resize"` (default): grow the viewport to fit all content, then screenshot. Cheaper, but
 *   distorts layouts that adapt to viewport height.
 * - `"stitch"`: scroll the `[data-testid='app-content']` scroller in viewport-sized steps and
 *   stitch the frames together. Faithful to what a user sees while scrolling at the natural
 *   viewport size; required for pages with viewport-adaptive components.
 */
async function takeViewportAndFullContentScreenshots(
  page: Page,
  viewport: { width: number; height: number },
  screenshot: string,
  pageSetup: (page: Page) => Promise<void>,
  options?: {
    maxDiffPixelRatio?: number;
    maxDiffPixels?: number;
    fullContent?: "resize" | "stitch";
  },
) {
  const { maxDiffPixelRatio, maxDiffPixels, fullContent = "resize" } = options ?? {};

  await page.setViewportSize(viewport);

  await pageSetup(page);
  await waitForLayoutStability();
  await expect(page).toHaveScreenshot(`${screenshot}.png`, { maxDiffPixelRatio, maxDiffPixels });

  const scrollTargetTestId = "app-content";

  // Skip the all-content snapshot if the scroll container has no overflow — e.g. layouts that
  // fix the page to the viewport and rely on internal scrollers (`EntitySearch` at `md+`). The
  // viewport screenshot above already represents everything visible to the user.
  if ((await getContentOverflow(page, scrollTargetTestId)) === 0) return;

  if (fullContent === "stitch") {
    expect(await captureFullContent(page, scrollTargetTestId)).toMatchSnapshot(
      `${screenshot}-all-content-stitched.png`,
      { maxDiffPixels, maxDiffPixelRatio },
    );
  } else {
    await setViewportHeightForAllContentScreenshot(page);
    await waitForLayoutStability();

    await expect(page).toHaveScreenshot(`${screenshot}-all-content.png`, {
      maxDiffPixelRatio,
      maxDiffPixels,
    });
  }
}

test.describe("Visual Regression: Responsive Layout, calculator page", () => {
  for (const { name, viewport, screenshot } of VIEWPORTS) {
    // Allow a small pixel difference to account for anti-aliasing and rendering variations,
    // particularly on large viewports. This causes some of these tests to miss catching minor
    // component changes, but it's necessary to prevent false positives in layout tests, and
    // other component-level visual regression tests should catch those minor component changes.
    const maxDiffPixels =
      viewport.height >= VIEWPORT_DESKTOP_DEFAULT.viewport.height ? 208 : undefined;

    test(name, async ({ page }) => {
      await takeViewportAndFullContentScreenshots(
        page,
        viewport,
        `calculator-${screenshot}`,
        async (page) => await goToPageAndWaitFor(page, "/calculator"),
        { maxDiffPixels },
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
        { fullContent: "stitch" },
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
        { fullContent: "stitch" },
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
