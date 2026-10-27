import { test, expect, type Page } from "@playwright/test";

import { getSelectedOptionLabel, selectOption } from "@/__tests__/e2e/select";
import {
  getIngredientNameInputAtIdx,
  getRecipeEditorPanelRecipeSelector,
  goToPageAndWaitFor,
  navigateViaSidebar,
  selectRecipeByName,
  showSidebarItems,
  waitForHydration,
} from "@/__tests__/e2e/util";

/** Built-in recipe on `/recipes`, which the tests load into the calculator. */
const RECIPE = "Standard Base";

// Loading a recipe involves several UI updates; generous timeout for parallel/underpowered runs.
const EXPECT_TIMEOUT_MS = 12000;

/** The slot the calculator's recipe editor shows, by its label: "Recipe", "Ref A", "Ref B". */
function editorSlot(page: Page) {
  return getSelectedOptionLabel(getRecipeEditorPanelRecipeSelector(page));
}

/** `/calculator` with any query, so a stray `?slot=` fails `toHaveURL`, not `waitForURL`. */
const isCalculatorUrl = (url: URL) => url.pathname === "/calculator";

/** On `/recipes`, load {@link RECIPE} into slot `slotLabel`, landing on `/calculator`. */
async function loadRecipeIntoSlot(page: Page, slotLabel: string) {
  await goToPageAndWaitFor(page, "/recipes");
  await waitForHydration(page);
  await showSidebarItems(page);

  await selectRecipeByName(page, RECIPE);
  await selectOption(page, page.getByLabel("Target slot"), slotLabel);
  await page.getByRole("button", { name: "Load" }).click();
  await page.waitForURL(isCalculatorUrl);
}

test.describe("Calculator recipe slot", () => {
  test("opens on the slot a recipe was loaded into, with no slot in the URL", async ({ page }) => {
    await loadRecipeIntoSlot(page, "Ref B");

    await expect(page).toHaveURL(/\/calculator$/);
    await expect.poll(() => editorSlot(page)).toBe("Ref B");
    await expect(getIngredientNameInputAtIdx(page, 0)).not.toHaveValue("", {
      timeout: EXPECT_TIMEOUT_MS,
    });
  });

  test("keeps the slot the user picked, not the one last loaded into, across Back and the sidebar", async ({
    page,
  }) => {
    await loadRecipeIntoSlot(page, "Ref B");
    await expect.poll(() => editorSlot(page)).toBe("Ref B");

    await selectOption(page, getRecipeEditorPanelRecipeSelector(page), "Ref A");
    await navigateViaSidebar(page, "/ingredients");

    // A `?slot=` left in the history entry by the Load would put this back on Ref B
    await page.goBack();
    await page.waitForURL(isCalculatorUrl);
    await expect(page).toHaveURL(/\/calculator$/);
    await expect.poll(() => editorSlot(page)).toBe("Ref A");

    await navigateViaSidebar(page, "/recipes");
    await navigateViaSidebar(page, "/calculator");
    await expect.poll(() => editorSlot(page)).toBe("Ref A");
  });

  test("returns to the main recipe on a reload, with the loaded recipe still in its slot", async ({
    page,
  }) => {
    await loadRecipeIntoSlot(page, "Ref B");
    await expect.poll(() => editorSlot(page)).toBe("Ref B");

    await page.reload();
    await waitForHydration(page);
    await expect.poll(() => editorSlot(page)).toBe("Recipe");

    // Only the selection resets; the recipe itself is stored with the editor's other slots
    await selectOption(page, getRecipeEditorPanelRecipeSelector(page), "Ref B");
    await expect(getIngredientNameInputAtIdx(page, 0)).not.toHaveValue("", {
      timeout: EXPECT_TIMEOUT_MS,
    });
  });
});
