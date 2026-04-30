import { test, expect, Page } from "@playwright/test";

import { KeyFilter } from "@/app/_elements/selects/key-filter-select";

import {
  getIngredientNameInputAtIdx,
  getMixPropertiesKeyFilterSelectInput,
  pasteRecipeAndWaitForUpdate,
  goToPageAndWaitFor,
} from "@/__tests__/e2e/util";

import { RecipeID } from "@/__tests__/assets";

/** Waits a timeout for charts to finish rendering; helps with screenshot stability */
function waitForChartsToRender(page: Page) {
  return page.waitForTimeout(500);
}

test.describe("Visual Regression: Empty State", () => {
  test("initial page load - empty recipe grid", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const recipeGrid = page.locator("#recipe-grid");
    await expect(recipeGrid).toBeVisible();

    await expect(recipeGrid).toHaveScreenshot("recipe-grid-empty.png");
  });

  test("empty properties grid", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const propertiesGrid = page.locator("#mix-properties-grid");
    await expect(propertiesGrid).toBeVisible();

    await expect(propertiesGrid).toHaveScreenshot("properties-grid-empty.png");
  });

  test("empty composition grid", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const compositionGrid = page.locator("#ing-composition-grid");
    await expect(compositionGrid).toBeVisible();

    await expect(compositionGrid).toHaveScreenshot("composition-grid-empty.png");
  });

  test("empty properties chart", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const propertiesChart = page.locator("#mix-properties-chart");
    await expect(propertiesChart).toBeVisible();

    await waitForChartsToRender(page);

    // @todo Investigate why there are intermittently up to 112 different pixels in the screenshot
    await expect(propertiesChart).toHaveScreenshot("properties-chart-empty.png", {
      maxDiffPixels: 112,
    });
  });

  test("empty FPD graph", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const fpdGraph = page.locator("#fpd-graph");
    await expect(fpdGraph).toBeVisible();

    await waitForChartsToRender(page);

    // @todo Investigate why there are intermittently up to 199 different pixels in the screenshot
    await expect(fpdGraph).toHaveScreenshot("fpd-graph-empty.png", { maxDiffPixels: 199 });
  });
});

test.describe("Visual Regression: Main and Reference Recipes Populated", () => {
  const initializeAndPasteRecipes = async (
    page: Page,
    browserName: string,
    recipeIds: RecipeID[],
  ) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    await goToPageAndWaitFor(page);

    for (const recipeId of recipeIds) {
      await pasteRecipeAndWaitForUpdate(page, browserName, recipeId);
    }
  };

  const getRecipeNames = (recipeIds: RecipeID[]) => {
    return recipeIds.map((id) => (id === RecipeID.Main ? "Main" : String(id)));
  };

  const makeRecipeName = (testNamePrefix: string, recipeIds: RecipeID[]) => {
    return `${testNamePrefix} - ${getRecipeNames(recipeIds).join(", ")} recipes populated`;
  };

  const makeFilename = (filenamePrefix: string, recipeIds: RecipeID[]) => {
    return `${filenamePrefix}-populated-${getRecipeNames(recipeIds)
      .map((v) => v.toLowerCase())
      .join("-")}.png`;
  };

  const testRecipeGrid = async (recipeIds: RecipeID[]) => {
    test(makeRecipeName("RecipeGrid", recipeIds), async ({ page, browserName }) => {
      await initializeAndPasteRecipes(page, browserName, recipeIds);

      const recipeGrid = page.locator("#recipe-grid");
      await expect(recipeGrid).toBeVisible();
      await expect(recipeGrid).toHaveScreenshot(makeFilename("recipe-grid", recipeIds));
    });
  };

  const testMixPropertiesGrid = async (recipeIds: RecipeID[]) => {
    test(makeRecipeName("MixPropertiesGrid", recipeIds), async ({ page, browserName }) => {
      await initializeAndPasteRecipes(page, browserName, recipeIds);

      const propertiesGrid = page.locator("#mix-properties-grid");
      await expect(propertiesGrid).toBeVisible();
      await propertiesGrid.locator("div").nth(1).scrollIntoViewIfNeeded();
      await expect(propertiesGrid).toHaveScreenshot(makeFilename("properties-grid", recipeIds));
    });
  };

  const testCompositionGrid = async (recipeIds: RecipeID[]) => {
    test(makeRecipeName("IngredientCompositionGrid", recipeIds), async ({ page, browserName }) => {
      await initializeAndPasteRecipes(page, browserName, recipeIds);

      const compositionGrid = page.locator("#ing-composition-grid");
      await expect(compositionGrid).toBeVisible();
      await compositionGrid.locator("div").nth(1).scrollIntoViewIfNeeded();
      await expect(compositionGrid).toHaveScreenshot(makeFilename("composition-grid", recipeIds));
    });
  };

  const testMixPropertiesChart = async (recipeIds: RecipeID[]) => {
    test(makeRecipeName("MixPropertiesChart", recipeIds), async ({ page, browserName }) => {
      await initializeAndPasteRecipes(page, browserName, recipeIds);

      await waitForChartsToRender(page);

      const propertiesChart = page.locator("#mix-properties-chart");
      await expect(propertiesChart).toBeVisible();
      await expect(propertiesChart).toHaveScreenshot(makeFilename("properties-chart", recipeIds));
    });
  };

  const testFpdGraph = async (recipeIds: RecipeID[]) => {
    test(makeRecipeName("FpdGraph", recipeIds), async ({ page, browserName }) => {
      await initializeAndPasteRecipes(page, browserName, recipeIds);

      await waitForChartsToRender(page);

      const fpdGraph = page.locator("#fpd-graph");
      await expect(fpdGraph).toBeVisible();
      await expect(fpdGraph).toHaveScreenshot(makeFilename("fpd-graph", recipeIds));
    });
  };

  testRecipeGrid([RecipeID.Main]);

  testMixPropertiesGrid([RecipeID.Main]);
  testMixPropertiesGrid([RecipeID.Main, RecipeID.RefA]);
  testMixPropertiesGrid([RecipeID.Main, RecipeID.RefA, RecipeID.RefB]);

  testCompositionGrid([RecipeID.Main]);

  testMixPropertiesChart([RecipeID.Main]);
  testMixPropertiesChart([RecipeID.Main, RecipeID.RefA]);
  testMixPropertiesChart([RecipeID.Main, RecipeID.RefA, RecipeID.RefB]);

  testFpdGraph([RecipeID.Main]);
  testFpdGraph([RecipeID.Main, RecipeID.RefA]);
  testFpdGraph([RecipeID.Main, RecipeID.RefA, RecipeID.RefB]);
});

test.describe("Visual Regression: Interactive States", () => {
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

test.describe("Visual Regression: Component Variations", () => {
  test("properties grid - scrolled state", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    await goToPageAndWaitFor(page);

    await pasteRecipeAndWaitForUpdate(page, browserName, RecipeID.Main);

    const keyFilter = getMixPropertiesKeyFilterSelectInput(page);
    await keyFilter.selectOption(KeyFilter.All);

    const propertiesGrid = page.locator("#mix-properties-grid");

    // Target the scrollable container with overflow-y-auto class
    const scrollableDiv = propertiesGrid.locator("div.overflow-y-auto");
    // Scroll to middle of properties list
    await scrollableDiv.evaluate((el) => (el.scrollTop = el.scrollHeight / 2));
    await page.waitForTimeout(200);

    await expect(propertiesGrid).toHaveScreenshot("properties-grid-scrolled.png");
  });
});
