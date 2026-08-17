import { test, expect } from "@playwright/test";

import { goToPageAndWaitFor } from "../e2e/util";
import { VIEWPORT_MOBILE_SMALL_PORTRAIT } from "./assets";
import { commentMetaMask, parkCursor, waitForCommentThread } from "./util";

/**
 * Visual coverage for blog posts.
 *
 * The page shots capture the viewport, and this post is long enough that the thread never appears
 * in them. They wait for it anyway, so the page is at its final height when the shot is taken.
 */
test.describe("Visual Regression: Blog Posts", () => {
  test("blog post", async ({ page }) => {
    await goToPageAndWaitFor(page, "/blog/2026-04-27-welcome");
    await waitForCommentThread(page);
    await expect(page).toHaveScreenshot("blog-post.png");
  });

  test.describe("mobile", () => {
    test.use({ hasTouch: VIEWPORT_MOBILE_SMALL_PORTRAIT.hasTouch });

    test("blog post, mobile", async ({ page }) => {
      await page.setViewportSize(VIEWPORT_MOBILE_SMALL_PORTRAIT.viewport);

      await goToPageAndWaitFor(page, "/blog/2026-04-27-welcome");
      await waitForCommentThread(page);
      await expect(page).toHaveScreenshot("blog-post-mobile.png");
    });
  });

  /** The seeded thread: a root with a reply, an edited comment, and the signed-out footer. */
  for (const dark of [false, true]) {
    test(`comment thread${dark ? " - dark" : ""}`, async ({ page }) => {
      if (dark) await page.emulateMedia({ colorScheme: "dark" });
      await goToPageAndWaitFor(page, "/blog/2026-04-27-welcome");
      await waitForCommentThread(page);
      await parkCursor(page);

      const thread = page.locator(".comments");
      await expect(thread).toHaveScreenshot(`blog-comments${dark ? "-dark" : ""}.png`, {
        mask: commentMetaMask(page),
      });
    });
  }
});
