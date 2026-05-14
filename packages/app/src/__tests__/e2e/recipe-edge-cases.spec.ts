import { test, expect } from "@playwright/test";

import {
  pasteToClipboard,
  getPasteButton,
  getIngredientNameInputAtIdx,
  goToPageAndWaitFor,
} from "@/__tests__/e2e/util";

test.describe("Recipe Edge Cases", () => {
  /**
   * Regression test: pasting a valid one-line recipe, then pasting a new recipe would crash the
   * app. It's unclear why this doesn't happen when pasting full multi-line recipes.
   */
  test("paste valid one-line recipe, then paste again should not crash", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    await goToPageAndWaitFor(page);

    await pasteToClipboard(page, browserName, "Fructose\t100");
    await getPasteButton(page).click();

    const ingNameInput = getIngredientNameInputAtIdx(page, 0);
    await expect(ingNameInput).toHaveValue("Fructose");

    await pasteToClipboard(page, browserName, "Whole Milk\t100");
    await getPasteButton(page).click();

    await expect(ingNameInput).toHaveValue("Whole Milk");
  });
});
