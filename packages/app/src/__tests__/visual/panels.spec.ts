import { test, expect, Page, Locator } from "@playwright/test";

import { KeyFilter } from "@/app/_elements/selects/key-filter-select";
import {
  DeltaToggle,
  DELTA_TOGGLE_SHORT_LABELS,
} from "@/app/_elements/selects/delta-toggle-select";
import { GroupBy, GROUP_BY_LABELS } from "@/lib/group-by";

import { RecipeID } from "@/__tests__/assets";
import { makeRecipesTestName, makeRecipesScreenshotFilename } from "@/__tests__/visual/assets";
import {
  getIngredientNameInputAtIdx,
  getPropertiesPanelKeyFilterSelectInput,
  getPropertiesPanelDeltaToggleSelectInput,
  getCompositionBreakdownPanelKeyFilterSelectInput,
  getGroupBySelectInput,
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

test.describe("Visual Regression: Panels, Empty State", () => {
  test("initial page load - empty recipe panel", async ({ page }) => {
    await goToPageAndWaitFor(page);
    const panel = await locatePanelAndExpectVisible(page, "#recipe-editor-panel");
    await expect(panel).toHaveScreenshot("recipe-editor-panel-empty.png");
  });

  test("empty properties panel", async ({ page }) => {
    await goToPageAndWaitFor(page);
    const panel = await locatePanelAndExpectVisible(page, "#properties-panel");
    await expect(panel).toHaveScreenshot("properties-panel-empty.png");
  });

  test("empty composition panel", async ({ page }) => {
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
      await goToPageAndPasteRecipes(page, browserName, recipeIds);
      const panel = await locatePanelAndExpectVisible(page, "#recipe-editor-panel");

      await expect(panel).toHaveScreenshot(
        makeRecipesScreenshotFilename("recipe-editor-panel", recipeIds),
      );
    });
  };

  const testPropertiesPanel = async (recipeIds: RecipeID[]) => {
    test(makeRecipesTestName("PropertiesPanel", recipeIds), async ({ page, browserName }) => {
      await goToPageAndPasteRecipes(page, browserName, recipeIds);
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
        await goToPageAndPasteRecipes(page, browserName, recipeIds);
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
      await goToPageAndPasteRecipes(page, browserName, recipeIds);
      const panel = await locatePanelAndExpectVisible(page, "#properties-chart-panel");

      await expect(panel).toHaveScreenshot(
        makeRecipesScreenshotFilename("properties-chart-panel", recipeIds),
      );
    });
  };

  const testFpdGraphPanel = async (recipeIds: RecipeID[]) => {
    test(makeRecipesTestName("FpdGraphPanel", recipeIds), async ({ page, browserName }) => {
      await goToPageAndPasteRecipes(page, browserName, recipeIds);
      const panel = await locatePanelAndExpectVisible(page, "#fpd-graph-panel");

      await expect(panel).toHaveScreenshot(
        makeRecipesScreenshotFilename("fpd-graph-panel", recipeIds),
      );
    });
  };

  const testWatchersPanel = async (recipeIds: RecipeID[]) => {
    test(makeRecipesTestName("WatchersPanel", recipeIds), async ({ page, browserName }) => {
      await goToPageAndPasteRecipes(page, browserName, recipeIds);
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
      await goToPageAndPasteRecipes(page, browserName, [RecipeID.Main]);
      await locatePanelAndExpectVisible(page, "#properties-panel");

      await expandNavbar(page);

      await selectOption(page, getPropertiesPanelKeyFilterSelectInput(page), keyFilter);
      await selectOption(page, getGroupBySelectInput(page), GROUP_BY_LABELS[mode]);

      // captureFullContent crops to the pane's box, which overflows if it spills below the fold.
      await page.getByTestId("properties-table-pane").scrollIntoViewIfNeeded();

      expect(
        await captureFullContent(page, "properties-table-pane", {
          stickyHeader: page.getByTestId("properties-table-pane").locator("thead"),
        }),
      ).toMatchSnapshot(`properties-table-grouped-${filenameSuffix}.png`);
    });
  };

  testGroupedMode(GroupBy.GroupedOnce, KeyFilter.All, "once-all");
  testGroupedMode(GroupBy.GroupedRepeat, KeyFilter.All, "repeat-all");
  testGroupedMode(GroupBy.GroupedOnce, KeyFilter.Active, "once-active");
  testGroupedMode(GroupBy.GroupedRepeat, KeyFilter.Active, "repeat-active");
});

test.describe("Visual Regression: Panels, Properties Delta Modes", () => {
  const testDeltaMode = (deltaToggle: DeltaToggle, filenameSuffix: string) => {
    test(`PropertiesTable delta (${filenameSuffix})`, async ({ page, browserName }) => {
      await goToPageAndPasteRecipes(page, browserName, [
        RecipeID.Main,
        RecipeID.RefA,
        RecipeID.RefB,
      ]);
      const panel = await locatePanelAndExpectVisible(page, "#properties-panel");

      await selectOption(
        page,
        getPropertiesPanelDeltaToggleSelectInput(page),
        DELTA_TOGGLE_SHORT_LABELS[deltaToggle],
      );

      await panel.locator("div").nth(1).scrollIntoViewIfNeeded();
      await expect(panel).toHaveScreenshot(`properties-panel-delta-${filenameSuffix}.png`);
    });
  };

  testDeltaMode(DeltaToggle.Absolute, "absolute");
  testDeltaMode(DeltaToggle.Relative, "relative");
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

/**
 * Force a table's scroll container to a fixed viewport size and scroll offset, then screenshot it.
 *
 * Pins the sticky `<thead>` / pinned columns against scrolled content so their z-order, opaque
 * backgrounds, and edges can be regression-checked mid-scroll. The fixed size makes the shot
 * deterministic and guarantees overflow regardless of how far the data spills at the test viewport
 * (e.g. the breakdown's handful of ingredient rows don't otherwise overflow vertically).
 */
async function captureScrollState(
  page: Page,
  container: Locator,
  size: { width: number; height: number },
  offset: { left: number; top: number },
  snapshot: string,
) {
  await container.evaluate((el, s) => {
    const style = (el as HTMLElement).style;
    style.flex = "none";
    style.width = `${s.width}px`;
    style.height = `${s.height}px`;
    style.maxWidth = "none";
    style.maxHeight = "none";
  }, size);
  await container.evaluate((el, o) => {
    el.scrollLeft = o.left;
    el.scrollTop = o.top;
  }, offset);
  await page.waitForTimeout(200);
  await expect(container).toHaveScreenshot(snapshot);
}

test.describe("Visual Regression: Panels, Table Scroll States", () => {
  test("recipe editor - vertical scroll freezes header", async ({ page, browserName }) => {
    await goToPageAndPasteRecipes(page, browserName, [RecipeID.Main]);

    await captureScrollState(
      page,
      page.getByTestId("recipe-editor-table-pane"),
      { width: 340, height: 200 },
      { left: 0, top: 100 },
      "recipe-editor-scroll-vertical.png",
    );
  });

  test("properties table - vertical scroll freezes header", async ({ page, browserName }) => {
    await goToPageAndPasteRecipes(page, browserName, [RecipeID.Main]);
    await selectOption(page, getPropertiesPanelKeyFilterSelectInput(page), KeyFilter.All);

    await captureScrollState(
      page,
      page.getByTestId("properties-table-pane"),
      { width: 300, height: 240 },
      { left: 0, top: 200 },
      "properties-table-scroll-vertical.png",
    );
  });

  test("properties table - horizontal scroll pins Property column", async ({
    page,
    browserName,
  }) => {
    // Multiple recipes plus a delta column give the table enough columns to overflow horizontally
    await goToPageAndPasteRecipes(page, browserName, [RecipeID.Main, RecipeID.RefA, RecipeID.RefB]);
    await selectOption(
      page,
      getPropertiesPanelDeltaToggleSelectInput(page),
      DELTA_TOGGLE_SHORT_LABELS[DeltaToggle.Relative],
    );

    await captureScrollState(
      page,
      page.getByTestId("properties-table-pane"),
      { width: 300, height: 240 },
      { left: 140, top: 0 },
      "properties-table-scroll-horizontal.png",
    );
  });

  test("composition breakdown - horizontal scroll pins Ingredient/Qty", async ({
    page,
    browserName,
  }) => {
    await goToPageAndPasteRecipes(page, browserName, [RecipeID.Main]);
    await selectOption(page, getCompositionBreakdownPanelKeyFilterSelectInput(page), KeyFilter.All);

    await captureScrollState(
      page,
      page.locator("#composition-breakdown-table"),
      { width: 360, height: 220 },
      { left: 180, top: 0 },
      "composition-breakdown-scroll-horizontal.png",
    );
  });

  test("composition breakdown - vertical scroll freezes header/totals", async ({
    page,
    browserName,
  }) => {
    await goToPageAndPasteRecipes(page, browserName, [RecipeID.Main]);
    await selectOption(page, getCompositionBreakdownPanelKeyFilterSelectInput(page), KeyFilter.All);

    await captureScrollState(
      page,
      page.locator("#composition-breakdown-table"),
      { width: 360, height: 220 },
      { left: 0, top: 120 },
      "composition-breakdown-scroll-vertical.png",
    );
  });
});

/** Forced panel width (px) that makes the chart panel portrait, so the bars flip horizontal. */
const HORIZONTAL_CHART_PANEL_WIDTH = 300;

/**
 * Shrink the chart panel to a portrait box to flip the bars horizontal. Only the width changes,
 * so the panel stays inside its grid cell; then wait for the canvas to redraw.
 */
async function makePropertiesChartPanelPortrait(page: Page, panel: Locator) {
  await panel.evaluate((el, width) => {
    (el as HTMLElement).style.width = `${width}px`;
  }, HORIZONTAL_CHART_PANEL_WIDTH);
  await page.waitForTimeout(300);
}

test.describe("Visual Regression: Panels, Properties Chart Horizontal Orientation", () => {
  const testPropertiesChartPanelHorizontal = (recipeIds: RecipeID[]) => {
    test(
      makeRecipesTestName("PropertiesChartPanel horizontal", recipeIds),
      async ({ page, browserName }) => {
        await goToPageAndPasteRecipes(page, browserName, recipeIds);
        const panel = await locatePanelAndExpectVisible(page, "#properties-chart-panel");

        await makePropertiesChartPanelPortrait(page, panel);

        await expect(panel).toHaveScreenshot(
          makeRecipesScreenshotFilename("properties-chart-panel-horizontal", recipeIds),
        );
      },
    );
  };

  testPropertiesChartPanelHorizontal([RecipeID.Main]);
  testPropertiesChartPanelHorizontal([RecipeID.Main, RecipeID.RefA, RecipeID.RefB]);
});
