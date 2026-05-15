import { Page } from "@playwright/test";

import { sleep_ms } from "@/lib/util";

/** Scrolls to the bottom of the page and waits for a short period to allow lazy-loaded content. */
export async function scrollToBottomOfPage(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep_ms(500); // Wait for any lazy-loaded content to load
}

/** Gets the vertical overflow of the main content area of the page, inside the shell (`Navbar`). */
export async function getContentOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.querySelector("[data-testid='app-content']");
    if (!el) return 0;
    return el.scrollHeight - el.clientHeight;
  });
}

/**
 * Sets the viewport height to fit all content for a full-page screenshot.
 *
 * `Navbar` sets the whole app shell as `h-screen` and the page content renders inside it, so
 * `fullPage: true` screenshots only capture the viewport height. This function manually grows the
 * viewport by the content area's vertical overflow to replicate Playwright's full-page screenshot
 * behavior, allowing us to capture the entire page content without relying on `fullPage: true`.
 *
 * Growing by overflow (rather than setting height to `scrollHeight`) automatically accounts for
 * the header and any other chrome outside the scroll container.
 *
 * This function adds 10px to the viewport height for visual clearance at the bottom edge.
 */
export async function setViewportHeightForAllContentScreenshot(page: Page) {
  const currentViewport = page.viewportSize();
  if (!currentViewport) {
    throw new Error("Viewport size is not set");
  }
  const overflow = await getContentOverflow(page);
  await page.setViewportSize({
    width: currentViewport.width,
    height: currentViewport.height + overflow + 10,
  });
}
