import { test, expect, type Page } from "@playwright/test";

import { goToPageAndWaitFor } from "../e2e/util";
import {
  commentMetaMask,
  parkCursor,
  setViewportHeightForAllAppContentScreenshot,
  waitForCommentThread,
} from "./util";

/**
 * Visual coverage for the documentation pages, in both themes.
 *
 * A sample of the routes rather than all of them: the index, a top-level page, a nested one, and
 * `getting-started`, the only docs route carrying a seeded comment.
 *
 * The theme comes from `emulateMedia`: `ThemeProvider` runs with `next-themes`' system default, so
 * the colour-scheme preference is what puts the `.dark` class on the root.
 */

/** Generated from the nav manifest rather than served by `[...slug]`, so it mounts no thread. */
const DOCS_INDEX = "/docs";

/** One route under coverage, shot in both themes. */
interface DocsPageCase {
  /** Test name; the dark variant appends `- dark`. */
  name: string;
  url: string;
  /** Snapshot basename; the dark variant appends `-dark`. */
  screenshot: string;
}

const DOCS_PAGES: DocsPageCase[] = [
  { name: "docs index", url: DOCS_INDEX, screenshot: "docs-index" },
  { name: "overview", url: "/docs/overview", screenshot: "docs-overview" },
  { name: "getting started", url: "/docs/getting-started", screenshot: "docs-getting-started" },
  { name: "other resources", url: "/docs/other-resources", screenshot: "docs-other-resources" },
  { name: "recipes", url: "/docs/other-resources/recipes", screenshot: "docs-recipes" },
];

/**
 * Load a docs route and screenshot the whole page.
 *
 * The cursor is parked so no link renders a hover state, and the viewport is grown to the content
 * height: the app shell is `h-screen`, so `fullPage` would capture only the first screen.
 *
 * Badge rows are masked whole: shields.io bakes its text into the art, so each image's width moves
 * with it. The `.badges` wrapper is a full-width block, so its box is stable. Comment metadata rows
 * are masked for the same reason — their relative timestamps age between runs.
 *
 * Every route but the index mounts a comment thread, which loads after mount; waiting for it before
 * measuring the content height keeps the viewport from being sized to a page that is about to grow.
 */
async function shootDocsPage(page: Page, doc: DocsPageCase, dark: boolean) {
  if (dark) await page.emulateMedia({ colorScheme: "dark" });
  await goToPageAndWaitFor(page, doc.url);
  if (doc.url !== DOCS_INDEX) await waitForCommentThread(page);
  await parkCursor(page);
  await setViewportHeightForAllAppContentScreenshot(page);
  await expect(page).toHaveScreenshot(`${doc.screenshot}${dark ? "-dark" : ""}.png`, {
    mask: [page.locator(".badges"), ...commentMetaMask(page)],
  });
}

test.describe("Visual Regression: Documentation", () => {
  for (const doc of DOCS_PAGES) {
    for (const dark of [false, true]) {
      test(`${doc.name}${dark ? " - dark" : ""}`, async ({ page }) => {
        await shootDocsPage(page, doc, dark);
      });
    }
  }
});
