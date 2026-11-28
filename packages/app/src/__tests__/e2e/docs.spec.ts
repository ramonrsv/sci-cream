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

  test("lists a page's nested pages only within its branch", async ({ page }) => {
    await goToDocs(page, "/docs/overview");
    await openContents(page);
    const recipes = contents(page).getByRole("link", { name: "Recipes", exact: true });
    await expect(recipes).toHaveCount(0);

    await contents(page).getByRole("link", { name: "Other Resources" }).click();

    await expect(page).toHaveURL(/\/docs\/other-resources$/);
    await openContents(page);
    await expect(recipes).toBeVisible();
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

/** The Reference, whose chapters come from the crate's docs rather than `content/docs`. */
test.describe("Science Reference", () => {
  /** Nested under Dairy, and with a subheading of its own. */
  const CHAPTER = "/docs/reference/dairy/milk-proteins";

  test("indexes its chapters at its own route", async ({ page }) => {
    await goToDocs(page, "/docs/reference");
    await expect(page.getByRole("heading", { level: 1, name: "Science Reference" })).toBeVisible();

    // The index's link: the contents list Milk Proteins only within Dairy's branch
    await page.locator(".doc-content").getByRole("link", { name: "Milk Proteins" }).click();

    await expect(page).toHaveURL(/\/docs\/reference\/dairy\/milk-proteins$/);
    await expect(page.getByRole("heading", { level: 1, name: "Milk Proteins" })).toBeVisible();
  });

  test("lists the chapter being read under it, with the chapter's headings", async ({ page }) => {
    await goToDocs(page, CHAPTER);
    await openContents(page);

    const reference = contents(page)
      .getByRole("listitem")
      .filter({ has: page.getByRole("link", { name: "Science Reference", exact: true }) });
    await expect(reference.getByRole("link", { name: "Milk Proteins" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(
      contents(page).getByRole("link", { name: "Crude and True Protein" }),
    ).toBeVisible();
  });

  test("follows a link between chapters to its section", async ({ page }) => {
    await goToDocs(page, "/docs/reference/sweeteners/sugars");
    await page.locator("article").getByRole("link", { name: "Potere Dolcificante (POD)" }).click();

    await expect(page).toHaveURL(/\/docs\/reference\/sweeteners#pod$/);
    await expect(page.locator("#pod")).toBeInViewport();
  });

  // A subject the server refuses shows an uncounted heading, saying comments aren't available
  test("gives each chapter a comment thread of its own", async ({ page }) => {
    await goToDocs(page, CHAPTER);

    const thread = page.locator(".comments");
    await expect(thread.getByRole("heading", { name: /^Comments \(\d+\)$/ })).toBeVisible();
  });
});
