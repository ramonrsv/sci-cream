import { test, expect, type Page } from "@playwright/test";

import { STORAGE_KEYS } from "@/lib/local-storage";
import { goToPageAndWaitFor, showHeaderActionButtons } from "@/__tests__/e2e/util";

/** Read the persisted calculator-layouts payload from `localStorage` (raw string or `null`) */
function readStoredLayout(page: Page) {
  return page.evaluate((key) => localStorage.getItem(key), STORAGE_KEYS.calculatorLayouts);
}

/** Drag the recipe panel's `axis` resize handle by (`dx`, `dy`) pixels. */
async function resizeRecipePanel(page: Page, axis: "e" | "s", dx: number, dy: number) {
  // The resize handle is a sibling of `#recipe-editor-panel` inside the `.react-grid-item`
  // wrapper, not a descendant — scope via `:has`
  const handle = page.locator(
    `.react-grid-item:has(#recipe-editor-panel) > .react-resizable-handle-${axis}`,
  );
  const box = await handle.boundingBox();
  if (!box) throw new Error(`${axis} resize handle has no bounding box`);

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  // `react-draggable` (used internally by the resize handle) needs intermediate mouse moves to
  // detect a drag — a single mouse.move call won't trigger one
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx, startY + dy, { steps: 10 });
  await page.mouse.up();
}

/** Resize the recipe panel by `dx` pixels via its east resize handle (positive = wider) */
async function resizeRecipePanelEast(page: Page, dx: number) {
  await resizeRecipePanel(page, "e", dx, 0);
}

/** Resize the recipe panel by `dy` pixels via its south resize handle (positive = taller) */
async function resizeRecipePanelSouth(page: Page, dy: number) {
  await resizeRecipePanel(page, "s", 0, dy);
}

test.describe("Calculator Layout Persistence", () => {
  test("'Reset layout' button is only visible on the calculator route", async ({ page }) => {
    await goToPageAndWaitFor(page, "/recipes");
    await expect(page.locator("#reset-layout-button")).toHaveCount(0);

    await goToPageAndWaitFor(page, "/calculator");
    await expect(page.locator("#reset-layout-button")).toBeVisible();
  });

  test("a custom layout persists across reloads and can be cleared via 'Reset layout'", async ({
    page,
    browserName,
  }) => {
    // Resizing via Playwright's mouse API is timing-sensitive and unreliable in WebKit
    test.skip(browserName === "webkit", "resize-handle drag timing is unreliable in WebKit");

    // Wide viewport keeps the calculator panel comfortably in `md`+ breakpoint with room for
    // every header button (the test interacts with the header's `Reset layout` button later on)
    await page.setViewportSize({ width: 1600, height: 1000 });
    await goToPageAndWaitFor(page, "/calculator");

    // Expand the sidebar up-front so the header has room for the reset button and the container
    // width stays constant across the entire test (a sidebar toggle would change panel widths)
    await showHeaderActionButtons(page);
    await page.waitForTimeout(300);

    const panel = page.locator("#recipe-editor-panel");
    const defaultBox = await panel.boundingBox();
    expect(defaultBox).not.toBeNull();

    // Resize the recipe panel wider — resize is a deterministic, vertical-compaction-stable
    // change (drag-to-move would be reversed by react-grid-layout's compaction since the panel
    // is already in the topmost row)
    await resizeRecipePanelEast(page, 200);

    // The save fires from the layout-change callback; poll storage until it appears
    await expect.poll(() => readStoredLayout(page)).not.toBeNull();

    const widerBox = await panel.boundingBox();
    expect(widerBox).not.toBeNull();
    // Should be visibly wider — give some slack for column snapping (~50px per column at lg)
    expect(widerBox!.width).toBeGreaterThan(defaultBox!.width + 40);

    // Reload — the stored layout should re-hydrate the panel at (approximately) its wider width.
    // Allow ~20px slack to account for scrollbar/reflow differences between the initial mount
    // and the post-reload mount
    await page.reload();
    await page.waitForLoadState("networkidle");

    const reloadedBox = await panel.boundingBox();
    expect(reloadedBox).not.toBeNull();
    expect(Math.abs(reloadedBox!.width - widerBox!.width)).toBeLessThan(30);
    expect(reloadedBox!.width).toBeGreaterThan(defaultBox!.width + 40);

    // Stub `window.confirm` to auto-accept; cleaner than chasing the dialog event
    await page.evaluate(() => {
      window.confirm = () => true;
    });
    await page.locator("#reset-layout-button").click();

    // Panel snaps back to its default width. (Storage may be repopulated with the defaults by
    // react-grid-layout's post-prop-update `onLayoutChange` — that's harmless, since a stored
    // copy of the defaults hydrates to the same layout as no storage at all.)
    await expect
      .poll(async () => {
        const box = await panel.boundingBox();
        return Math.abs((box?.width ?? 0) - defaultBox!.width) < 20;
      })
      .toBe(true);
  });

  test("the recipe panel can be resized vertically via its newly-enabled south handle", async ({
    page,
    browserName,
  }) => {
    // Resizing via Playwright's mouse API is timing-sensitive and unreliable in WebKit
    test.skip(browserName === "webkit", "resize-handle drag timing is unreliable in WebKit");

    await page.setViewportSize({ width: 1600, height: 1000 });
    await goToPageAndWaitFor(page, "/calculator");

    const panel = page.locator("#recipe-editor-panel");
    const defaultBox = await panel.boundingBox();
    expect(defaultBox).not.toBeNull();

    // Drag the south handle down — vertical resize is new for the recipe panel (it was
    // horizontal-only before), so this exercises the newly-added `s` axis
    await resizeRecipePanelSouth(page, 150);

    // The save fires from the layout-change callback; poll storage until it appears
    await expect.poll(() => readStoredLayout(page)).not.toBeNull();

    const tallerBox = await panel.boundingBox();
    expect(tallerBox).not.toBeNull();
    // Should be visibly taller — give slack for row snapping (~36px per grid row)
    expect(tallerBox!.height).toBeGreaterThan(defaultBox!.height + 30);

    // The taller height re-hydrates from storage on reload
    await page.reload();
    await page.waitForLoadState("networkidle");

    const reloadedBox = await panel.boundingBox();
    expect(reloadedBox).not.toBeNull();
    expect(Math.abs(reloadedBox!.height - tallerBox!.height)).toBeLessThan(30);
    expect(reloadedBox!.height).toBeGreaterThan(defaultBox!.height + 30);
  });
});
