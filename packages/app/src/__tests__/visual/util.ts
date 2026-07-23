import { Page, Locator } from "@playwright/test";
import sharp from "sharp";

import { sleep_ms } from "@/lib/util";

/** Scrolls to the bottom of the page and waits for a short period to allow lazy-loaded content. */
export async function scrollToBottomOfPage(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep_ms(500); // Wait for any lazy-loaded content to load
}

/**
 * Park the cursor top-right, off the content and off the sidebar's hover zone that would open the
 * peek drawer over it. Top-right stays in the cropped-out header, so it adds no hover artifacts.
 */
export async function parkCursor(page: Page) {
  await page.mouse.move((page.viewportSize()?.width ?? 1) - 1, 0);
}

/** Vertical overflow (hidden scrollable height, `scrollHeight - clientHeight`) of `locator`. */
export async function getOverflow(locator: Locator): Promise<number> {
  return locator.evaluate((el) => el.scrollHeight - el.clientHeight);
}

/**
 * Grows the viewport height by `extraHeight` pixels (width unchanged) so content that overflows the
 * current viewport can be captured in a single screenshot. Shared grow primitive behind
 * {@link setViewportHeightForAllAppContentScreenshot} and {@link expandToFullHeight}.
 */
async function growViewportHeight(page: Page, extraHeight: number) {
  const viewport = page.viewportSize();
  if (!viewport) {
    throw new Error("Viewport size is not set");
  }
  await page.setViewportSize({ width: viewport.width, height: viewport.height + extraHeight });
}

/**
 * Expands an overflow container (popup, menu) so one element screenshot captures all its content,
 * with sticky descendants appearing once (unlike {@link captureFullContent}). Clears the element's
 * fixed `height` (e.g. `h-100`) so it grows, then grows the viewport: a Floating-UI-anchored
 * Headless UI popup re-clamps its inline `max-height` to the viewport on every resize, so enlarging
 * the viewport — not overriding the style — is what lets it fit.
 */
export async function expandToFullHeight(page: Page, locator: Locator) {
  await locator.evaluate((el) => ((el as HTMLElement).style.height = "auto"));

  const overflow = await getOverflow(locator);
  if (overflow <= 0) return;

  // Grow by the hidden overflow (plus clearance) so the popup's recomputed max-height fits it all.
  await growViewportHeight(page, overflow + 16);
  await sleep_ms(100); // Let Floating UI's size middleware re-clamp to the taller viewport.
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
export async function setViewportHeightForAllAppContentScreenshot(page: Page) {
  await growViewportHeight(page, (await getOverflow(page.getByTestId("app-content"))) + 10);
}

/**
 * Captures a scroll container's full content as a single stitched PNG.
 *
 * `scrollTargetTestId` identifies the scroll container by `data-testid` (defaults to `app-content`,
 * the app shell's main content area). Useful for capturing nested scrollers, e.g. the search list
 * or detail panel inside `EntitySearch`.
 *
 * Unlike {@link setViewportHeightForAllAppContentScreenshot}, this keeps the viewport at its
 * natural size so viewport-adaptive components (`flex-1`, charts that observe their box, etc.)
 * render at the size a real user would see. Each viewport-sized frame is captured at successive
 * scroll positions of the target scroller, then cropped to the scroller's bounding box, trimmed for
 * overlap, and composited vertically with `sharp`.
 *
 * A `stickyHeader` locator (e.g. a sticky `<thead>`) is kept in the first frame and cropped from
 * every later one, so it appears once instead of repeating at each seam; the scroll step also
 * shrinks by its height, since a sticky header occludes the content behind it (which would
 * otherwise be lost). Other sticky elements still repeat. Chrome outside the scroller (e.g. the
 * navbar `Header`) is excluded.
 */
export async function captureFullContent(
  page: Page,
  scrollTargetTestId = "app-content",
  { stickyHeader }: { stickyHeader?: Locator } = {},
): Promise<Buffer> {
  const scroller = page.getByTestId(scrollTargetTestId);
  const box = await scroller.boundingBox();
  if (!box) throw new Error(`'${scrollTargetTestId}' scroller has no bounding box`);

  const headerHeight = stickyHeader ? ((await stickyHeader.boundingBox())?.height ?? 0) : 0;
  if (headerHeight >= box.height) {
    throw new Error("stickyHeader is taller than the scroll viewport; cannot stitch");
  }

  const dpr = await page.evaluate(() => window.devicePixelRatio);
  const totalHeight = await scroller.evaluate((el) => el.scrollHeight);

  // Advance by the below-header area so content hidden behind the sticky header in one frame is
  // revealed in the next; with no sticky header this is the full viewport (unchanged behavior).
  const step = box.height - headerHeight;
  const positions: number[] = [];
  for (let y = 0; y < totalHeight; y += step) {
    positions.push(Math.min(y, totalHeight - box.height));
  }
  const uniquePositions = [...new Set(positions)];

  // Park the cursor off the content so scrolling doesn't trigger `:hover` highlights beneath it.
  await parkCursor(page);

  const pieces: { buf: Buffer; height: number }[] = [];
  let prevBottom = 0;
  for (const [i, top] of uniquePositions.entries()) {
    await scroller.evaluate(
      (el, t) => el.scrollTo({ top: t, behavior: "instant" as ScrollBehavior }),
      top,
    );
    await sleep_ms(100);
    const shot = await page.screenshot();

    // Skip the already-captured overlap and, after the first frame, the repeated sticky header.
    const skipTop = Math.max(i === 0 ? 0 : headerHeight, prevBottom - top);
    const cropTopPx = Math.round((box.y + skipTop) * dpr);
    const cropHeightPx = Math.round((box.height - skipTop) * dpr);
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
