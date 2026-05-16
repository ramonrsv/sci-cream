import { Page } from "@playwright/test";
import sharp from "sharp";

import { WATCHER_SELECTED_PROPS_KEY } from "@/app/_elements/watchers/watchers";
import { sleep_ms } from "@/lib/util";

/**
 * Inject a watcher-selection list into `localStorage` before navigation, so that `WatchersView`'s
 * mount-time hydration picks it up. Use to control which cards appear in screenshot tests.
 */
export async function presetWatcherSelection(page: Page, propKeys: string[]) {
  await page.addInitScript(
    ([key, keys]) => {
      localStorage.setItem(key, JSON.stringify(keys));
    },
    [WATCHER_SELECTED_PROPS_KEY, propKeys] as const,
  );
}

/** Scrolls to the bottom of the page and waits for a short period to allow lazy-loaded content. */
export async function scrollToBottomOfPage(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep_ms(500); // Wait for any lazy-loaded content to load
}

/**
 * Gets the vertical overflow of the scroll container identified by `scrollTargetTestId`.
 *
 * Defaults to the app shell's main content area (`[data-testid='app-content']`).
 */
export async function getContentOverflow(
  page: Page,
  scrollTargetTestId = "app-content",
): Promise<number> {
  return page.evaluate((testId) => {
    const el = document.querySelector(`[data-testid='${testId}']`);
    if (!el) return 0;
    return el.scrollHeight - el.clientHeight;
  }, scrollTargetTestId);
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

/**
 * Captures a scroll container's full content as a single stitched PNG.
 *
 * `scrollTargetTestId` identifies the scroll container by `data-testid` (defaults to
 * `app-content`, the app shell's main content area). Useful for capturing nested scrollers, e.g.
 * the search list or detail panel inside `EntitySearch`.
 *
 * Unlike {@link setViewportHeightForAllContentScreenshot}, this keeps the viewport at its natural
 * size so viewport-adaptive components (`flex-1`, charts that observe their box, etc.) render at
 * the size a real user would see. Each viewport-sized frame is captured at successive scroll
 * positions of the target scroller, then cropped to the scroller's bounding box, trimmed for
 * overlap, and composited vertically with `sharp`.
 *
 * Sticky elements inside the scroll container will repeat across the stitched output, since they
 * appear at the same on-screen position in every frame. Chrome outside the scroller (e.g. the
 * navbar `Header`) is excluded.
 */
export async function captureFullContent(
  page: Page,
  scrollTargetTestId = "app-content",
): Promise<Buffer> {
  const scroller = page.getByTestId(scrollTargetTestId);
  const box = await scroller.boundingBox();
  if (!box) throw new Error(`'${scrollTargetTestId}' scroller has no bounding box`);

  const dpr = await page.evaluate(() => window.devicePixelRatio);
  const totalHeight = await scroller.evaluate((el) => el.scrollHeight);

  const positions: number[] = [];
  for (let y = 0; y < totalHeight; y += box.height) {
    positions.push(Math.min(y, totalHeight - box.height));
  }
  const uniquePositions = [...new Set(positions)];

  const pieces: { buf: Buffer; height: number }[] = [];
  let prevBottom = 0;
  for (const top of uniquePositions) {
    await scroller.evaluate(
      (el, t) => el.scrollTo({ top: t, behavior: "instant" as ScrollBehavior }),
      top,
    );
    await sleep_ms(100);
    const shot = await page.screenshot();

    const overlap = Math.max(0, prevBottom - top);
    const cropTopPx = Math.round((box.y + overlap) * dpr);
    const cropHeightPx = Math.round((box.height - overlap) * dpr);
    if (cropHeightPx <= 0) continue;

    const piece = await sharp(shot)
      .extract({
        left: Math.round(box.x * dpr),
        top: cropTopPx,
        width: Math.round(box.width * dpr),
        height: cropHeightPx,
      })
      .toBuffer();
    pieces.push({ buf: piece, height: cropHeightPx });
    prevBottom = top + box.height;
  }

  const stitchedHeight = pieces.reduce((sum, p) => sum + p.height, 0);
  const composites: sharp.OverlayOptions[] = [];
  let y = 0;
  for (const p of pieces) {
    composites.push({ input: p.buf, left: 0, top: y });
    y += p.height;
  }

  return sharp({
    create: {
      width: Math.round(box.width * dpr),
      height: stitchedHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
}
