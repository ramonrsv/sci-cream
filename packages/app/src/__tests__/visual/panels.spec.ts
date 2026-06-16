import { test, expect, Page } from "@playwright/test";

import { KeyFilter } from "@/app/_elements/selects/key-filter-select";
import { GroupBy, GROUP_BY_LABELS } from "@/lib/group-by";

import { RecipeID } from "@/__tests__/assets";
import { makeRecipesTestName, makeRecipesScreenshotFilename } from "@/__tests__/visual/assets";
import {
  getIngredientNameInputAtIdx,
  getPropertiesPanelKeyFilterSelectInput,
  getGroupBySelectInput,
  pasteRecipeAndWaitForUpdate,
  goToPageAndWaitFor,
  goToPageAndPasteRecipes,
  expandNavbar,
} from "@/__tests__/e2e/util";
import { selectOption } from "@/__tests__/e2e/select";
import { captureFullContent } from "@/__tests__/visual/util";

// The empty chart panels show run-to-run aliasing differences in their canvas text, so they don't
// reproduce pixel-for-pixel; populated charts don't, so only these need tolerance. This budget
// absorbs the observed shimmer (~450 px) without hiding a real regression. Bump it if they flake.
const EMPTY_CHART_MAX_DIFF_PIXELS = 750;

/** Locate a panel by its ID and expect it to be visible */
async function locatePanelAndExpectVisible(page: Page, panelId: string) {
  const panel = page.locator(panelId);
  await expect(panel).toBeVisible();
  return panel;
}

/** Initialize the page and paste the given recipes */
async function initializePageAndPasteRecipes(
  page: Page,
  browserName: string,
  recipeIds: RecipeID[],
) {
  test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");
  await goToPageAndPasteRecipes(page, browserName, recipeIds);
}

test.describe("Visual Regression: Panels, Empty State", () => {
  test("initial page load - empty recipe grid", async ({ page }) => {
    await goToPageAndWaitFor(page);
    const panel = await locatePanelAndExpectVisible(page, "#recipe-editor-panel");
    await expect(panel).toHaveScreenshot("recipe-editor-panel-empty.png");
  });

  test("empty properties grid", async ({ page }) => {
    await goToPageAndWaitFor(page);
    const panel = await locatePanelAndExpectVisible(page, "#properties-panel");
    await expect(panel).toHaveScreenshot("properties-panel-empty.png");
  });

  test("empty composition grid", async ({ page }) => {
    await goToPageAndWaitFor(page);
    const panel = await locatePanelAndExpectVisible(page, "#composition-breakdown-panel");
    await expect(panel).toHaveScreenshot("composition-breakdown-panel-empty.png");
  });

  test("empty properties chart", async ({ page }) => {
    await goToPageAndWaitFor(page);
    const panel = await locatePanelAndExpectVisible(page, "#properties-chart-panel");

    await expect(panel).toHaveScreenshot("properties-chart-panel-empty.png", {
      maxDiffPixels: EMPTY_CHART_MAX_DIFF_PIXELS,
    });
  });

  test("empty FPD graph", async ({ page }) => {
    await goToPageAndWaitFor(page);
    const panel = await locatePanelAndExpectVisible(page, "#fpd-graph-panel");

    await expect(panel).toHaveScreenshot("fpd-graph-panel-empty.png", {
      maxDiffPixels: EMPTY_CHART_MAX_DIFF_PIXELS,
    });
  });

  test("empty watchers panel", async ({ page }) => {
    await goToPageAndWaitFor(page);
    const panel = await locatePanelAndExpectVisible(page, "#watchers-panel");

    await panel.scrollIntoViewIfNeeded();
    await expect(panel).toHaveScreenshot("watchers-panel-empty.png");
  });
});

test.describe("Visual Regression: Panels, Main and Reference Recipes Populated", () => {
  const testRecipeEditorPanel = async (recipeIds: RecipeID[]) => {
    test(makeRecipesTestName("RecipeEditorPanel", recipeIds), async ({ page, browserName }) => {
      await initializePageAndPasteRecipes(page, browserName, recipeIds);
      const panel = await locatePanelAndExpectVisible(page, "#recipe-editor-panel");

      await expect(panel).toHaveScreenshot(
        makeRecipesScreenshotFilename("recipe-editor-panel", recipeIds),
      );
    });
  };

  const testPropertiesPanel = async (recipeIds: RecipeID[]) => {
    test(makeRecipesTestName("PropertiesPanel", recipeIds), async ({ page, browserName }) => {
      await initializePageAndPasteRecipes(page, browserName, recipeIds);
      const panel = await locatePanelAndExpectVisible(page, "#properties-panel");

      await panel.locator("div").nth(1).scrollIntoViewIfNeeded();
      await expect(panel).toHaveScreenshot(
        makeRecipesScreenshotFilename("properties-panel", recipeIds),
      );
    });
  };

  const testCompositionBreakdownPanel = async (recipeIds: RecipeID[]) => {
    test(
      makeRecipesTestName("CompositionBreakdownPanel", recipeIds),
      async ({ page, browserName }) => {
        await initializePageAndPasteRecipes(page, browserName, recipeIds);
        const panel = await locatePanelAndExpectVisible(page, "#composition-breakdown-panel");

        await panel.locator("div").nth(1).scrollIntoViewIfNeeded();
        await expect(panel).toHaveScreenshot(
          makeRecipesScreenshotFilename("composition-breakdown-panel", recipeIds),
        );
      },
    );
  };

  const testPropertiesChartPanel = async (recipeIds: RecipeID[]) => {
    test(makeRecipesTestName("PropertiesChartPanel", recipeIds), async ({ page, browserName }) => {
      await initializePageAndPasteRecipes(page, browserName, recipeIds);
      const panel = await locatePanelAndExpectVisible(page, "#properties-chart-panel");

      await expect(panel).toHaveScreenshot(
        makeRecipesScreenshotFilename("properties-chart-panel", recipeIds),
      );
    });
  };

  const testFpdGraphPanel = async (recipeIds: RecipeID[]) => {
    test(makeRecipesTestName("FpdGraphPanel", recipeIds), async ({ page, browserName }) => {
      await initializePageAndPasteRecipes(page, browserName, recipeIds);
      const panel = await locatePanelAndExpectVisible(page, "#fpd-graph-panel");

      await expect(panel).toHaveScreenshot(
        makeRecipesScreenshotFilename("fpd-graph-panel", recipeIds),
      );
    });
  };

  const testWatchersPanel = async (recipeIds: RecipeID[]) => {
    test(makeRecipesTestName("WatchersPanel", recipeIds), async ({ page, browserName }) => {
      await initializePageAndPasteRecipes(page, browserName, recipeIds);
      const panel = await locatePanelAndExpectVisible(page, "#watchers-panel");

      await panel.scrollIntoViewIfNeeded();
      await expect(panel).toHaveScreenshot(
        makeRecipesScreenshotFilename("watchers-panel", recipeIds),
      );
    });
  };

  testRecipeEditorPanel([RecipeID.Main]);
  testCompositionBreakdownPanel([RecipeID.Main]);

  for (const testFunc of [
    testPropertiesPanel,
    testPropertiesChartPanel,
    testFpdGraphPanel,
    testWatchersPanel,
  ]) {
    testFunc([RecipeID.Main]);
    testFunc([RecipeID.Main, RecipeID.RefA]);
    testFunc([RecipeID.Main, RecipeID.RefB]);
    testFunc([RecipeID.Main, RecipeID.RefA, RecipeID.RefB]);
    testFunc([RecipeID.RefA]);
    testFunc([RecipeID.RefB]);
    testFunc([RecipeID.RefA, RecipeID.RefB]);
  }
});

test.describe("Visual Regression: Panels, Properties Group-by Modes", () => {
  const testGroupedMode = (mode: GroupBy, keyFilter: KeyFilter, filenameSuffix: string) => {
    test(`PropertiesTable grouped (${filenameSuffix})`, async ({ page, browserName }) => {
      await initializePageAndPasteRecipes(page, browserName, [RecipeID.Main]);
      await locatePanelAndExpectVisible(page, "#properties-panel");

      await expandNavbar(page);

      await selectOption(page, getPropertiesPanelKeyFilterSelectInput(page), keyFilter);
      await selectOption(page, getGroupBySelectInput(page), GROUP_BY_LABELS[mode]);

      // captureFullContent crops to the pane's box, which overflows if it spills below the fold.
      await page.getByTestId("properties-table-pane").scrollIntoViewIfNeeded();

      expect(await captureFullContent(page, "properties-table-pane")).toMatchSnapshot(
        `properties-table-grouped-${filenameSuffix}.png`,
      );
    });
  };

  testGroupedMode(GroupBy.GroupedOnce, KeyFilter.All, "once-all");
  testGroupedMode(GroupBy.GroupedRepeat, KeyFilter.All, "repeat-all");
  testGroupedMode(GroupBy.GroupedOnce, KeyFilter.Active, "once-active");
  testGroupedMode(GroupBy.GroupedRepeat, KeyFilter.Active, "repeat-active");
});

test.describe("Visual Regression: Panels, Interactive States", () => {
  test("valid ingredient input focused", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const nameInput = getIngredientNameInputAtIdx(page, 0);
    await nameInput.click();
    await nameInput.fill("Milk");
    await expect(nameInput).toHaveValue("Milk");

    await expect(nameInput).toHaveScreenshot("ingredient-input-valid-focused.png");
  });

  test("invalid ingredient input focused", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const nameInput = getIngredientNameInputAtIdx(page, 0);
    await nameInput.click();
    await nameInput.fill("Invalid Ingredient");
    await expect(nameInput).toHaveValue("Invalid Ingredient");

    await expect(nameInput).toHaveScreenshot("ingredient-input-invalid-focused.png");
  });

  test("invalid ingredient input unfocused", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const nameInput = getIngredientNameInputAtIdx(page, 0);
    await nameInput.click();
    await nameInput.fill("Invalid Ingredient");
    await page.click("body");
    await expect(nameInput).toHaveValue("Invalid Ingredient");

    await expect(nameInput).toHaveScreenshot("ingredient-input-invalid-unfocused.png");
  });
});

test.describe("Visual Regression: Panels, Component Variations", () => {
  test("properties grid - scrolled state", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    await goToPageAndWaitFor(page);

    await pasteRecipeAndWaitForUpdate(page, browserName, RecipeID.Main);

    const keyFilter = getPropertiesPanelKeyFilterSelectInput(page);
    await selectOption(page, keyFilter, KeyFilter.All);

    const propertiesGrid = page.locator("#properties-panel");

    // Target the scrollable container with overflow-y-auto class
    const scrollableDiv = propertiesGrid.locator("div.overflow-y-auto");
    // Scroll to middle of properties list
    await scrollableDiv.evaluate((el) => (el.scrollTop = el.scrollHeight / 2));
    await page.waitForTimeout(200);

    await expect(propertiesGrid).toHaveScreenshot("properties-panel-scrolled.png");
  });
});
