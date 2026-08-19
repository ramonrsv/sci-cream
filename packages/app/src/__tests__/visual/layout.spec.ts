import { test, expect, Page } from "@playwright/test";

import {
  goToPageAndWaitFor,
  pasteRecipeAndWaitForUpdate,
  selectIngredientByName,
  selectRecipeByName,
} from "@/__tests__/e2e/util";

import { RecipeID } from "@/__tests__/assets";
import { VIEWPORTS, type ViewportAsset } from "@/__tests__/visual/assets";
import {
  captureFullContent,
  commentMetaMask,
  getOverflow,
  setViewportHeightForAllAppContentScreenshot,
  waitForCommentThread,
} from "@/__tests__/visual/util";

/** Waits a short period to let the grid layout settle (width measurement, breakpoint changes). */
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
  options?: { fullContent?: "resize" | "stitch" },
) {
  const { fullContent = "resize" } = options ?? {};

  await page.setViewportSize(viewport);

  await pageSetup(page);
  await waitForLayoutStability();

  // Unconditional: it resolves to nothing without a thread, and covers any page that grows one.
  const mask = commentMetaMask(page);
  await expect(page).toHaveScreenshot(`${screenshot}.png`, { mask });

  const appContentTestId = "app-content";

  // Skip the all-content snapshot if the scroll container has no overflow — e.g. layouts that
  // fix the page to the viewport and rely on internal scrollers (`EntitySearch` at `md+`). The
  // viewport screenshot above already represents everything visible to the user.
  if ((await getOverflow(page.getByTestId(appContentTestId))) === 0) return;

  if (fullContent === "stitch") {
    expect(await captureFullContent(page, appContentTestId)).toMatchSnapshot(
      `${screenshot}-all-content-stitched.png`,
    );
  } else {
    await setViewportHeightForAllAppContentScreenshot(page);
    await waitForLayoutStability();

    await expect(page).toHaveScreenshot(`${screenshot}-all-content.png`, { mask });
  }
}

/**
 * Register one viewport's layout test, emulating the input modality that device reports so the
 * navbar shows its real affordance: a tap-peek hamburger on touch, a hover-peek logo on mouse.
 */
function testViewportLayout(
  asset: ViewportAsset,
  screenshotPrefix: string,
  pageSetup: (page: Page, browserName: string) => Promise<void>,
  options?: { fullContent?: "resize" | "stitch" },
) {
  const { name, viewport, hasTouch, screenshot } = asset;

  test.describe(name, () => {
    test.use({ hasTouch });

    test("layout", async ({ page, browserName }) => {
      await takeViewportAndFullContentScreenshots(
        page,
        viewport,
        `${screenshotPrefix}-${screenshot}`,
        (page) => pageSetup(page, browserName),
        options,
      );
    });
  });
}

test.describe("Visual Regression: Responsive Layout, calculator page", () => {
  for (const asset of VIEWPORTS) {
    testViewportLayout(asset, "calculator", async (page, browserName) => {
      await goToPageAndWaitFor(page, "/calculator");

      // In addition to providing a better visual representation of the layout, particularly
      // size variable components like Watchers, it also makes chart snapshots deterministic.
      await pasteRecipeAndWaitForUpdate(page, browserName, RecipeID.RefA);
      // Main last so that 'Recipe' is left selected in RecipeEditor
      await pasteRecipeAndWaitForUpdate(page, browserName, RecipeID.Main);
    });
  }
});

test.describe("Visual Regression: Responsive Layout, recipes page", () => {
  for (const asset of VIEWPORTS) {
    testViewportLayout(
      asset,
      "recipes",
      async (page) => {
        await goToPageAndWaitFor(page, "/recipes");
        await selectRecipeByName(page, "Standard Base");
      },
      { fullContent: "stitch" },
    );
  }
});

test.describe("Visual Regression: Responsive Layout, ingredients page", () => {
  for (const asset of VIEWPORTS) {
    testViewportLayout(
      asset,
      "ingredients",
      async (page) => {
        await goToPageAndWaitFor(page, "/ingredients");
        await selectIngredientByName(page, "Sealtest 3.25% Milk");
      },
      { fullContent: "stitch" },
    );
  }
});

test.describe("Visual Regression: Responsive Layout, blog post", () => {
  for (const asset of VIEWPORTS) {
    testViewportLayout(
      asset,
      "blog-post",
      // The all-content shot is sized to content height, and the thread mounts empty then grows.
      async (page) => {
        await goToPageAndWaitFor(page, "/blog/2026-04-27-welcome");
        await waitForCommentThread(page);
      },
    );
  }
});

test.describe("Visual Regression: Responsive Layout, docs page", () => {
  for (const asset of VIEWPORTS) {
    testViewportLayout(
      asset,
      "docs-page",
      // The one docs page with both nested children and headings of its own, so the contents shows
      // every kind of entry. Waiting for the thread as the blog case does, and for the same reason.
      async (page) => {
        await goToPageAndWaitFor(page, "/docs/other-resources");
        await waitForCommentThread(page);
      },
    );
  }
});
