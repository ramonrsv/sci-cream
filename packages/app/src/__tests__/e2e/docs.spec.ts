import { test, expect, type Page } from "@playwright/test";

import { goToPageAndWaitFor, waitForHydration } from "@/__tests__/e2e/util";

/**
 * The docs table of contents, across every project.
 *
 * Written viewport-agnostically: below `md` the rail collapses into a disclosure, so each test
 * opens the list only when the bar is showing, and the two shapes are covered by one run each.
 */

/** The mobile disclosure. Present in the markup at every width, visible only below `md`. */
function contentsToggle(page: Page) {
  return page.getByRole("button", { name: "Contents" });
}

/** The contents nav itself, named so it does not collide with the app shell's `Main` nav. */
function contents(page: Page) {
  return page.getByRole("navigation", { name: "Documentation" });
}

/** Open the list when the viewport collapses it, leaving entries clickable either way. */
async function openContents(page: Page) {
  const toggle = contentsToggle(page);
  if (await toggle.isVisible()) await toggle.click();
}

/** Load a docs route and wait out hydration, so a click cannot land before the handlers attach. */
async function goToDocs(page: Page, url: string) {
  await goToPageAndWaitFor(page, url);
  await waitForHydration(page);
}

test.describe("Documentation contents", () => {
  test("moves between pages", async ({ page }) => {
    await goToDocs(page, "/docs");
    await openContents(page);
    await contents(page).getByRole("link", { name: "Overview" }).click();

    await expect(page).toHaveURL(/\/docs\/overview$/);
    await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
  });

  test("marks the page being read, and only that one", async ({ page }) => {
    await goToDocs(page, "/docs/other-resources");
    await openContents(page);

    await expect(contents(page).getByRole("link", { name: "Other Resources" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(contents(page).locator("[aria-current]")).toHaveCount(1);
  });

  test("lists the headings of the page being read, and no others", async ({ page }) => {
    await goToDocs(page, "/docs/other-resources");
    await openContents(page);

    // `Books` is an `h2` of this page; `sci-cream crate` belongs to `overview`.
    await expect(contents(page).getByRole("link", { name: "Books" })).toBeVisible();
    await expect(contents(page).getByRole("link", { name: "sci-cream crate" })).toHaveCount(0);
  });

  test("follows a heading to its section", async ({ page }) => {
    await goToDocs(page, "/docs/other-resources");
    await openContents(page);
    await contents(page).getByRole("link", { name: "Books" }).click();

    await expect(page).toHaveURL(/#books$/);
    await expect(page.locator("#books")).toBeInViewport();
  });

  test("lands a heading clear of the bar that would cover it", async ({ page }) => {
    await goToDocs(page, "/docs/other-resources");
    const toggle = contentsToggle(page);
    test.skip(!(await toggle.isVisible()), "the rail sits beside the article, covering nothing");

    await toggle.click();
    await contents(page).getByRole("link", { name: "Books" }).click();

    // The scrollport's `scroll-padding-top` is what keeps the target below the pinned bar.
    const bar = await contents(page).boundingBox();
    const heading = await page.locator("#books").boundingBox();
    expect(bar).not.toBeNull();
    expect(heading).not.toBeNull();
    expect(heading!.y).toBeGreaterThanOrEqual(bar!.y + bar!.height);
  });

  test("collapses the list once a page is picked", async ({ page }) => {
    await goToDocs(page, "/docs/other-resources");
    const toggle = contentsToggle(page);
    test.skip(!(await toggle.isVisible()), "the rail is always open, with nothing to collapse");

    const entry = contents(page).getByRole("link", { name: "Overview" });
    await expect(entry).toBeHidden();
    await toggle.click();
    await expect(entry).toBeVisible();

    await entry.click();

    await expect(page).toHaveURL(/\/docs\/overview$/);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});
