import { test, expect } from "@playwright/test";

import { KeyFilter } from "@/app/_elements/selects/key-filter-select";
import { QtyToggle, qtyToggleToShortStr } from "@/app/_elements/selects/qty-toggle-select";
import { RecipeID, recipeIdToOption } from "@/__tests__/assets";
import {
  goToPageAndWaitFor,
  getRecipeEditorPanelRecipeSelector,
  getPropertiesPanelKeyFilterSelectInput,
  getCompositionBreakdownPanelQtyToggleSelectInput,
  expandNavbar,
} from "@/__tests__/e2e/util";
import { getSelectControl, getOpenSelectMenu, selectOption } from "@/__tests__/e2e/select";

// ---------------------------------------------------------------------------
// QtyToggleSelect
// ---------------------------------------------------------------------------

test.describe("Visual Regression: QtyToggleSelect", () => {
  test("Select Comp, Qty(g), Qty(%)", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const selector = getCompositionBreakdownPanelQtyToggleSelectInput(page);
    await expect(selector).toBeVisible();

    await selectOption(page, selector, qtyToggleToShortStr(QtyToggle.Composition));
    await expect(selector).toHaveScreenshot("qty-toggle-select-comp.png");

    await selectOption(page, selector, qtyToggleToShortStr(QtyToggle.Quantity));
    await expect(selector).toHaveScreenshot("qty-toggle-select-qty.png");

    await selectOption(page, selector, qtyToggleToShortStr(QtyToggle.Percentage));
    await expect(selector).toHaveScreenshot("qty-toggle-select-percentage.png");
  });

  test("Clicked, hovered", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const selector = getCompositionBreakdownPanelQtyToggleSelectInput(page);
    await expect(selector).toBeVisible();

    await selector.click();
    await expect(selector).toHaveScreenshot("qty-toggle-select-clicked.png");

    await page.keyboard.press("Escape");
    await selector.hover();
    await expect(selector).toHaveScreenshot("qty-toggle-select-hovered.png");
  });
});

// ---------------------------------------------------------------------------
// KeyFilterSelect
// ---------------------------------------------------------------------------

test.describe("Visual Regression: KeyFilterSelect", () => {
  test("Select Auto, Non-Zero, All, Custom", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const selector = getPropertiesPanelKeyFilterSelectInput(page);
    await expect(selector).toBeVisible();

    await selectOption(page, selector, KeyFilter.Auto);
    await expect(selector).toHaveScreenshot("key-filter-select-auto.png");

    await selectOption(page, selector, KeyFilter.NonZero);
    await expect(selector).toHaveScreenshot("key-filter-select-nonzero.png");

    await selectOption(page, selector, KeyFilter.All);
    await expect(selector).toHaveScreenshot("key-filter-select-all.png");

    await selectOption(page, selector, KeyFilter.Custom);
    await expect(selector).toHaveScreenshot("key-filter-select-custom.png");
  });

  test("Clicked, hovered", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const selector = getPropertiesPanelKeyFilterSelectInput(page);
    await expect(selector).toBeVisible();

    await selector.click();
    await expect(selector).toHaveScreenshot("key-filter-select-clicked.png");

    await page.keyboard.press("Escape");
    await selector.hover();
    await expect(selector).toHaveScreenshot("key-filter-select-hovered.png");
  });

  test("Custom popup open", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const selector = getPropertiesPanelKeyFilterSelectInput(page);
    await expect(selector).toBeVisible();
    await selectOption(page, selector, KeyFilter.Custom);

    await page.locator("#properties-panel #customize-keys-button").click();
    const popup = page.locator(".popup").first();
    await expect(popup).toBeVisible();
    await expect(popup).toHaveScreenshot("key-filter-select-custom-popup.png");

    await popup.evaluate((el) => (el.scrollTop = el.scrollHeight / 2));
    await page.waitForTimeout(200);
    await expect(popup).toHaveScreenshot("key-filter-select-custom-popup-scrolled.png");
  });
});

// ---------------------------------------------------------------------------
// RecipeSelect
// ---------------------------------------------------------------------------

test.describe("Visual Regression: RecipeSelect", () => {
  test("Select Main, RefA, RefB", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const selector = getRecipeEditorPanelRecipeSelector(page);
    await expect(selector).toBeVisible();

    await selectOption(page, selector, recipeIdToOption(RecipeID.Main));
    await expect(selector).toHaveScreenshot("recipe-select-main.png");

    await selectOption(page, selector, recipeIdToOption(RecipeID.RefA));
    await expect(selector).toHaveScreenshot("recipe-select-ref-a.png");

    await selectOption(page, selector, recipeIdToOption(RecipeID.RefB));
    await expect(selector).toHaveScreenshot("recipe-select-ref-b.png");
  });

  test("Clicked, hovered", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const selector = getRecipeEditorPanelRecipeSelector(page);
    await expect(selector).toBeVisible();

    await selector.click();
    await expect(selector).toHaveScreenshot("recipe-select-clicked.png");

    await page.keyboard.press("Escape");
    await selector.hover();
    await expect(selector).toHaveScreenshot("recipe-select-hovered.png");
  });
});

// ---------------------------------------------------------------------------
// ThemeSelect
// ---------------------------------------------------------------------------

test.describe("Visual Regression: ThemeSelect", () => {
  test("Select Light, Dark, System", async ({ page }) => {
    await goToPageAndWaitFor(page);
    await expandNavbar(page);

    const selector = getSelectControl(page, "#theme-select");

    await selectOption(page, selector, "Light");
    await expect(selector).toHaveScreenshot("theme-select-light.png");

    await selectOption(page, selector, "Dark");
    await expect(selector).toHaveScreenshot("theme-select-dark.png");

    await selectOption(page, selector, "System");
    await expect(selector).toHaveScreenshot("theme-select-system.png");
  });

  test("Popup open", async ({ page }) => {
    await goToPageAndWaitFor(page);
    await expandNavbar(page);

    const selector = getSelectControl(page, "#theme-select");
    await selector.click();

    const menu = getOpenSelectMenu(page);
    await expect(menu).toBeVisible();
    await expect(menu).toHaveScreenshot("theme-select-popup.png");
  });

  test("Clicked, hovered", async ({ page }) => {
    await goToPageAndWaitFor(page);
    await expandNavbar(page);

    const selector = getSelectControl(page, "#theme-select");

    await selector.click();
    await expect(selector).toHaveScreenshot("theme-select-clicked.png");

    await page.keyboard.press("Escape");
    await selector.hover();
    await expect(selector).toHaveScreenshot("theme-select-hovered.png");
  });
});
