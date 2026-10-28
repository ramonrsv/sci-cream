import { test, expect, type Page } from "@playwright/test";

import { getSelectedOptionLabel, selectOption } from "@/__tests__/e2e/select";
import {
  goToPageAndWaitFor,
  loginAsTestUserWithCredentials,
  navigateViaSidebar,
  selectIngredientByName,
  selectRecipeByName,
  showSidebarItems,
  waitForHydration,
} from "@/__tests__/e2e/util";
import { TEST_USER_B } from "@/__tests__/seed-assets";
import { Rating } from "@/lib/rating";
import { formatVersionOption } from "@/lib/recipe/version";

/** Built-in ingredient the `/ingredients` test selects. */
const INGREDIENT = "Sucrose";

/** TEST_USER_B's seeded recipe with two versions: a labelled, Bad v1 and the latest v2. */
const RECIPE = "Chocolate Ice Cream";

/** The option for {@link RECIPE}'s v1 in the version dropdown. */
const FIRST_VERSION = formatVersionOption("1", {
  isLatest: false,
  label: "first cut",
  rating: Rating.Bad,
});

/** The detail panel's heading for `name`, shown while that entry is selected. */
function detailHeading(page: Page, name: string) {
  return page.locator(".search-detail-panel").getByRole("heading", { name, exact: true });
}

/** The recipe detail panel's version dropdown. */
function versionSelect(page: Page) {
  return page.getByLabel("Recipe version");
}

/** Leave `path` for the calculator and come back, both through the sidebar. */
async function visitCalculatorAndReturn(page: Page, path: string) {
  await navigateViaSidebar(page, "/calculator");
  await navigateViaSidebar(page, path);
}

/** Reload `path`, which starts with nothing retained, so nothing selected. */
async function expectNoSelectionAfterReload(page: Page) {
  await page.reload();
  await waitForHydration(page);
  await expect(page.locator(".search-detail-panel")).toHaveCount(0);
}

test.describe("Search selection retention", () => {
  test("/ingredients keeps its selection across a visit to the calculator, but not a reload", async ({
    page,
  }) => {
    await goToPageAndWaitFor(page, "/ingredients");
    await waitForHydration(page);
    await showSidebarItems(page);
    await selectIngredientByName(page, INGREDIENT);

    await visitCalculatorAndReturn(page, "/ingredients");
    await expect(detailHeading(page, INGREDIENT)).toBeVisible();

    await expectNoSelectionAfterReload(page);
  });

  test("/recipes keeps its selected recipe and version across a visit to the calculator, but not a reload", async ({
    page,
  }) => {
    await goToPageAndWaitFor(page);
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await goToPageAndWaitFor(page, "/recipes");
    await waitForHydration(page);
    await showSidebarItems(page);

    // The embedded dataset has its own "Chocolate Ice Cream"; the Saved tab picks the seeded one
    await page.getByRole("button", { name: "Saved", exact: true }).click();
    await selectRecipeByName(page, RECIPE);
    await selectOption(page, versionSelect(page), FIRST_VERSION);

    await visitCalculatorAndReturn(page, "/recipes");
    await expect(detailHeading(page, RECIPE)).toBeVisible();
    await expect.poll(() => getSelectedOptionLabel(versionSelect(page))).toMatch(/^v1\b/);

    await expectNoSelectionAfterReload(page);
  });
});
