import { test, expect, type Page } from "@playwright/test";

import { goToPageAndWaitFor } from "../e2e/util";
import { parkCursor, setViewportHeightForAllAppContentScreenshot } from "./util";

/**
 * Visual coverage for the documentation pages, in both themes.
 *
 * `/docs` and `/docs/other-resources` render their listed pages after their own, so between them
 * these four routes cover every docs page; the two leaf routes are shot separately to keep a diff
 * in one of them readable.
 *
 * The theme comes from `emulateMedia`: `ThemeProvider` runs with `next-themes`' system default, so
 * the colour-scheme preference is what puts the `.dark` class on the root.
 */

const DOCS_INDEX = "/docs";
const OVERVIEW = "/docs/overview";
const OTHER_RESOURCES = "/docs/other-resources";
const RECIPES = "/docs/other-resources/recipes";

/**
 * Load a docs route and screenshot the whole page.
 *
 * The cursor is parked so no link renders a hover state, and the viewport is grown to the content
 * height: the app shell is `h-screen`, so `fullPage` would capture only the first screen.
 *
 * Badges are masked: shields.io bakes the version, CI result, and coverage into the art.
 */
async function shootDocsPage(page: Page, url: string, name: string, { dark = false } = {}) {
  if (dark) await page.emulateMedia({ colorScheme: "dark" });
  await goToPageAndWaitFor(page, url);
  await parkCursor(page);
  await setViewportHeightForAllAppContentScreenshot(page);
  await expect(page).toHaveScreenshot(name, { mask: [page.locator(".badges img")] });
}

test.describe("Visual Regression: Documentation", () => {
  test("docs index", async ({ page }) => {
    await shootDocsPage(page, DOCS_INDEX, "docs-index.png");
  });

  test("docs index - dark", async ({ page }) => {
    await shootDocsPage(page, DOCS_INDEX, "docs-index-dark.png", { dark: true });
  });

  test("overview", async ({ page }) => {
    await shootDocsPage(page, OVERVIEW, "docs-overview.png");
  });

  test("overview - dark", async ({ page }) => {
    await shootDocsPage(page, OVERVIEW, "docs-overview-dark.png", { dark: true });
  });

  test("other resources", async ({ page }) => {
    await shootDocsPage(page, OTHER_RESOURCES, "docs-other-resources.png");
  });

  test("other resources - dark", async ({ page }) => {
    await shootDocsPage(page, OTHER_RESOURCES, "docs-other-resources-dark.png", { dark: true });
  });

  test("recipes", async ({ page }) => {
    await shootDocsPage(page, RECIPES, "docs-recipes.png");
  });

  test("recipes - dark", async ({ page }) => {
    await shootDocsPage(page, RECIPES, "docs-recipes-dark.png", { dark: true });
  });
});
