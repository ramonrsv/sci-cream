import { test, expect } from "@playwright/test";

import {
  goToPageAndWaitFor,
  navigateViaSidebar,
  showSidebarItems,
  waitForHydration,
} from "@/__tests__/e2e/util";

const QUERY = "chocolate";

/** Routes whose search query outlives a visit elsewhere, with their search input's placeholder. */
const SEARCH_ROUTES = [
  { path: "/recipes", placeholder: "Search by name, author, or ingredient…" },
  { path: "/ingredients", placeholder: "Search by name or category…" },
  { path: "/make-recipe", placeholder: "Search saved batches…" },
];

test.describe("Search query retention", () => {
  for (const { path, placeholder } of SEARCH_ROUTES) {
    test(`${path} keeps its query across a visit to the calculator, but not a reload`, async ({
      page,
    }) => {
      const searchInput = page.getByPlaceholder(placeholder);

      await goToPageAndWaitFor(page, path);
      await waitForHydration(page);
      await showSidebarItems(page);
      await searchInput.fill(QUERY);

      await navigateViaSidebar(page, "/calculator");
      await navigateViaSidebar(page, path);
      await expect(searchInput).toHaveValue(QUERY);

      // Held in memory only, so a reload starts clean.
      expect(await page.evaluate(() => Object.values(localStorage).join("\n"))).not.toContain(
        QUERY,
      );
      await page.reload();
      await expect(searchInput).toHaveValue("");
    });
  }
});
