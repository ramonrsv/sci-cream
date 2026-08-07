import { test, expect, Page } from "@playwright/test";

import { goToPageAndWaitFor, loginAsTestUserWithCredentials } from "@/__tests__/e2e/util";

import { TEST_USER_B } from "@/lib/database/assets";
import { RATING_GLYPHS, Rating } from "@/lib/rating";
import {
  RatingFilter,
  RATING_FILTER_SHORT_LABELS,
} from "@/app/_elements/selects/rating-filter-select";

/**
 * Quality signals end to end: the star on a recipe and the rating on one of its versions, both
 * persisted server-side, so the assertions here are after a reload rather than in-memory state.
 *
 * Leans on the seeded fixtures: "Chocolate Ice Cream" is starred and holds a Bad v1 and a Great v2;
 * "Standard Base" carries no star and a single Good version.
 */
test.describe("Recipe quality signals", () => {
  // Each test mutates TEST_USER_B's seeded rows and restores them, so they must not interleave.
  test.describe.configure({ mode: "serial", timeout: 30000 });

  const STARRED = "Chocolate Ice Cream";
  const UNSTARRED = "Standard Base";

  /**
   * Sign in and land on the recipes page, listing only the user's saved recipes. The embedded
   * dataset carries its own "Chocolate Ice Cream" and "Standard Base", and sorts ahead of the
   * saved ones, so the Saved tab is what makes these names refer to the seeded rows.
   */
  async function openRecipes(page: Page) {
    await goToPageAndWaitFor(page);
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await goToPageAndWaitFor(page, "/recipes");
    await page.getByRole("button", { name: "Saved", exact: true }).click();
    await expect(page.locator(".search-list-item").first()).toBeVisible();
  }

  /** The list entry whose title is exactly `name` — several seeded names extend one another. */
  function listItem(page: Page, name: string) {
    return page.locator(".search-list-item").filter({ has: page.getByText(name, { exact: true }) });
  }

  /** Open `name`'s detail panel. */
  async function select(page: Page, name: string) {
    await listItem(page, name).click();
    await expect(page.locator(".search-detail-panel")).toBeVisible();
  }

  /** Open the rating popup and choose `rating`; choosing the one already set clears it. */
  async function chooseRating(page: Page, rating: Rating) {
    await page.getByTestId("rating-trigger").click();
    await page.getByTestId(`rating-${rating.toLowerCase()}`).click();
  }

  /** Assert the collapsed trigger wears `rating`, `"none"` standing for unrated. */
  async function expectRating(page: Page, rating: Rating | "none") {
    await expect(page.getByTestId("rating-toggle")).toHaveAttribute("data-rating", rating);
  }

  test("shows the seeded star on the recipe and in its detail panel", async ({ page }) => {
    await openRecipes(page);

    await expect(listItem(page, STARRED).getByTestId("favourite-marker")).toBeVisible();
    await expect(listItem(page, UNSTARRED).getByTestId("favourite-marker")).toHaveCount(0);

    await select(page, STARRED);
    await expect(page.getByTestId("favourite-toggle")).toHaveAttribute("aria-pressed", "true");
  });

  test("persists a star across a reload", async ({ page }) => {
    await openRecipes(page);
    await select(page, UNSTARRED);

    await page.getByTestId("favourite-toggle").click();
    await expect(page.getByTestId("favourite-toggle")).toHaveAttribute("aria-pressed", "true");

    try {
      await page.reload();
      await expect(listItem(page, UNSTARRED).getByTestId("favourite-marker")).toBeVisible();
    } finally {
      await select(page, UNSTARRED);
      await page.getByTestId("favourite-toggle").click();
      await expect(page.getByTestId("favourite-toggle")).toHaveAttribute("aria-pressed", "false");
    }
  });

  test("narrows the list to favourites, and restores it", async ({ page }) => {
    await openRecipes(page);

    await page.getByTestId("favourites-filter").click();
    await expect(listItem(page, STARRED)).toBeVisible();
    await expect(listItem(page, UNSTARRED)).toHaveCount(0);
    // Only one seeded recipe is starred, so the filter leaves exactly it.
    await expect(page.locator(".search-list-item")).toHaveCount(1);

    await page.getByTestId("favourites-filter").click();
    await expect(listItem(page, UNSTARRED)).toBeVisible();
  });

  test("keeps the favourites filter switched on across a reload", async ({ page }) => {
    await openRecipes(page);

    await page.getByTestId("favourites-filter").click();
    await expect(page.getByTestId("favourites-filter")).toHaveAttribute("aria-pressed", "true");

    try {
      await page.reload();
      await expect(page.getByTestId("favourites-filter")).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator(".search-list-item")).toHaveCount(1);
    } finally {
      await page.getByTestId("favourites-filter").click();
    }
  });

  test("filters by rating, matching a recipe on any of its versions", async ({ page }) => {
    await openRecipes(page);
    const ratingFilter = page.locator("#rating-filter-select select");

    // Chocolate's v2 is Great; Standard Base's only version is merely Good.
    await ratingFilter.selectOption({ label: RATING_FILTER_SHORT_LABELS[RatingFilter.Great] });
    await expect(listItem(page, STARRED)).toBeVisible();
    await expect(listItem(page, UNSTARRED)).toHaveCount(0);

    // Chocolate's v1 is Bad, so it matches here too — on a different version than above.
    await ratingFilter.selectOption({ label: RATING_FILTER_SHORT_LABELS[RatingFilter.Bad] });
    await expect(listItem(page, STARRED)).toBeVisible();
    await expect(listItem(page, UNSTARRED)).toHaveCount(0);

    await ratingFilter.selectOption({
      label: RATING_FILTER_SHORT_LABELS[RatingFilter.GoodOrBetter],
    });
    await expect(listItem(page, STARRED)).toBeVisible();
    await expect(listItem(page, UNSTARRED)).toBeVisible();

    await ratingFilter.selectOption({ label: RATING_FILTER_SHORT_LABELS[RatingFilter.Any] });
    await expect(page.locator(".search-list-item").count()).resolves.toBeGreaterThan(2);
  });

  test("labels rated versions in the version dropdown", async ({ page }) => {
    await openRecipes(page);
    await select(page, STARRED);

    const options = page.getByRole("combobox", { name: "Recipe version" }).locator("option");
    await expect(options.filter({ hasText: RATING_GLYPHS[Rating.Great] })).toHaveCount(1);
    await expect(options.filter({ hasText: RATING_GLYPHS[Rating.Bad] })).toHaveCount(1);
  });

  test("persists a rating change across a reload", async ({ page }) => {
    await openRecipes(page);
    await select(page, UNSTARRED);

    // Seeded Good; move it to Great and confirm the server kept it.
    await expectRating(page, Rating.Good);
    await chooseRating(page, Rating.Great);
    await expectRating(page, Rating.Great);

    try {
      await page.reload();
      await select(page, UNSTARRED);
      await expectRating(page, Rating.Great);
    } finally {
      await chooseRating(page, Rating.Good);
      await expectRating(page, Rating.Good);
    }
  });

  test("clears a rating when its choice is made a second time", async ({ page }) => {
    await openRecipes(page);
    await select(page, UNSTARRED);

    await chooseRating(page, Rating.Good);
    await expectRating(page, "none");

    try {
      await page.reload();
      await select(page, UNSTARRED);
      await expectRating(page, "none");
    } finally {
      await chooseRating(page, Rating.Good);
      await expectRating(page, Rating.Good);
    }
  });
});

/**
 * The batch star, which has its own action rather than riding a save. The seeded fixtures give
 * TEST_USER_B a starred "Friday tasting batch" and an unstarred "Chocolate trial".
 */
test.describe("Batch quality signals", () => {
  // Each test mutates TEST_USER_B's seeded rows and restores them, so they must not interleave.
  test.describe.configure({ mode: "serial", timeout: 30000 });

  const STARRED = "Friday tasting batch";
  const UNSTARRED = "Chocolate trial";

  /** Sign in and land on the make-recipe page with its saved-batch list rendered. */
  async function openBatches(page: Page) {
    await goToPageAndWaitFor(page);
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await goToPageAndWaitFor(page, "/make-recipe");
    await expect(page.getByTestId("batch-editor")).toBeVisible();
  }

  /** The saved-batch list entry whose title is `name`. */
  function listItem(page: Page, name: string) {
    return page.getByTestId("batch-list").locator("li").filter({ hasText: name }).first();
  }

  test("shows the seeded star in the batch list", async ({ page }) => {
    await openBatches(page);

    await expect(listItem(page, STARRED).getByTestId("favourite-marker")).toBeVisible();
    await expect(listItem(page, UNSTARRED).getByTestId("favourite-marker")).toHaveCount(0);
  });

  test("offers the star only once a saved batch is loaded", async ({ page }) => {
    await openBatches(page);

    await expect(page.getByTestId("favourite-toggle")).toHaveCount(0);

    await listItem(page, STARRED).getByRole("button").click();
    await expect(page.getByTestId("favourite-toggle")).toHaveAttribute("aria-pressed", "true");
  });

  test("narrows the batch list to favourites", async ({ page }) => {
    await openBatches(page);

    await page.getByTestId("favourites-filter").click();
    await expect(listItem(page, STARRED)).toBeVisible();
    await expect(listItem(page, UNSTARRED)).toHaveCount(0);

    await page.getByTestId("favourites-filter").click();
    await expect(listItem(page, UNSTARRED)).toBeVisible();
  });

  test("persists a batch star across a reload", async ({ page }) => {
    await openBatches(page);
    await listItem(page, UNSTARRED).getByRole("button").click();
    await expect(page.getByTestId("favourite-toggle")).toBeVisible();

    await page.getByTestId("favourite-toggle").click();
    await expect(page.getByTestId("favourite-toggle")).toHaveAttribute("aria-pressed", "true");

    try {
      await page.reload();
      await expect(listItem(page, UNSTARRED).getByTestId("favourite-marker")).toBeVisible();
    } finally {
      await listItem(page, UNSTARRED).getByRole("button").click();
      await expect(page.getByTestId("favourite-toggle")).toBeVisible();
      await page.getByTestId("favourite-toggle").click();
      await expect(page.getByTestId("favourite-toggle")).toHaveAttribute("aria-pressed", "false");
    }
  });
});
