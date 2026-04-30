import { test, expect } from "@playwright/test";

import { goToPageAndWaitFor } from "../e2e/util";

test.describe("Visual Regression: Blog Posts", () => {
  test("blog post", async ({ page }) => {
    await goToPageAndWaitFor(page, "/blog/2026-04-27-welcome");
    await expect(page).toHaveScreenshot("blog-post.png");
  });

  test("blog post, shrunk", async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 720 });

    await goToPageAndWaitFor(page, "/blog/2026-04-27-welcome");
    await expect(page).toHaveScreenshot("blog-post-shrunk.png");
  });
});
