import { test, expect } from "@playwright/test";

import { KeyFilter } from "@/app/_elements/selects/key-filter-select";

import { RecipeID } from "@/__tests__/assets";
import { VIEWPORTS } from "@/__tests__/visual/assets";
import {
  getPropertiesPanelKeyFilterSelectInput,
  goToPageAndWaitFor,
  goToPageAndPasteRecipes,
  selectRecipeByName,
  presetWatcherSelection,
  locateWatcherCardByKeyAndExpectVisible,
} from "@/__tests__/e2e/util";
import { getSelectControl, selectOption } from "@/__tests__/e2e/select";
import { CompKey, compToPropKey } from "@workspace/sci-cream";

test.describe("Visual Regression: Toolbars, Space Constraints", () => {
  for (const { name, viewport, screenshot } of VIEWPORTS) {
    test(`toolbar overflow - calculator - properties view - ${name}`, async ({
      page,
      browserName,
    }) => {
      page.setViewportSize(viewport);

      // Paste two recipes to ensure that the upcoming delta selects are visible
      await goToPageAndPasteRecipes(page, browserName, [RecipeID.Main, RecipeID.RefA]);

      // Select the "Custom" key filter to reveal the "customize" button
      const selector = getPropertiesPanelKeyFilterSelectInput(page);
      await selectOption(page, selector, KeyFilter.Custom);

      const toolbar = page.locator("#properties-panel .toolbar");
      await expect(toolbar).toHaveScreenshot(
        `toolbar-calculator-properties-view-${screenshot}.png`,
      );
    });

    test(`toolbar overflow - recipes - properties view - ${name}`, async ({ page }) => {
      page.setViewportSize(viewport);
      await goToPageAndWaitFor(page, "/recipes");
      await selectRecipeByName(page, "Standard Base");

      // Select the "Custom" key filter to reveal the "customize" button
      const selector = getSelectControl(page, "#key-filter-select");
      await selectOption(page, selector, KeyFilter.Custom);

      const toolbar = page.locator(".toolbar");
      await expect(toolbar).toHaveScreenshot(`toolbar-recipes-properties-view-${screenshot}.png`);
    });

    test(`toolbar overflow - calculator - watchers view - ${name}`, async ({
      page,
      browserName,
    }) => {
      page.setViewportSize(viewport);

      const TOTAL_SOLIDS = compToPropKey(CompKey.TotalSolids);
      const SUCRALOSE = compToPropKey(CompKey.Sucralose);

      await presetWatcherSelection(page, [TOTAL_SOLIDS, SUCRALOSE]);

      // Paste two recipes to ensure that the fill-targets-from-ref buttons are visible
      await goToPageAndPasteRecipes(page, browserName, [
        RecipeID.Main,
        RecipeID.RefA,
        RecipeID.RefB,
      ]);

      // Select the "Custom" key filter to reveal the "customize" button
      const selector = getSelectControl(page, "#watchers-panel #key-filter-select");
      await selectOption(page, selector, KeyFilter.Custom);

      // Set targets to cause error and warnings so that the popup buttons are visible
      let card = await locateWatcherCardByKeyAndExpectVisible(page, TOTAL_SOLIDS);
      let input = card.getByTestId(`watcher-card-${TOTAL_SOLIDS}-target`);
      await input.fill("-2");
      card = await locateWatcherCardByKeyAndExpectVisible(page, SUCRALOSE);
      input = card.getByTestId(`watcher-card-${SUCRALOSE}-target`);
      await input.fill("2");

      const toolbar = page.locator("#watchers-panel .toolbar");
      await expect(toolbar).toHaveScreenshot(`toolbar-calculator-watchers-view-${screenshot}.png`);
    });
  }
});
