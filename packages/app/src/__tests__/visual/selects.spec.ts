import { test, expect } from "@playwright/test";

import { KeyFilter } from "@/app/_elements/selects/key-filter-select";
import { QtyToggle, QTY_TOGGLE_SHORT_LABELS } from "@/app/_elements/selects/qty-toggle-select";
import { GroupBy, GROUP_BY_LABELS } from "@/lib/group-by";
import { RecipeID, recipeIdToOption } from "@/__tests__/assets";
import {
  goToPageAndWaitFor,
  getRecipeEditorPanelRecipeSelector,
  getPropertiesPanelKeyFilterSelectInput,
  getGroupBySelectInput,
  getCompositionBreakdownPanelQtyToggleSelectInput,
  showHeaderActionButtons,
} from "@/__tests__/e2e/util";
import { getSelectControl, getOpenSelectMenu, selectOption } from "@/__tests__/e2e/select";
import { expandToFullHeight } from "@/__tests__/visual/util";

// ---------------------------------------------------------------------------
// QtyToggleSelect
// ---------------------------------------------------------------------------

test.describe("Visual Regression: QtyToggleSelect", () => {
  test("Select Comp, Qty(g), Qty(%)", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const selector = getCompositionBreakdownPanelQtyToggleSelectInput(page);
    await expect(selector).toBeVisible();

    await selectOption(page, selector, QTY_TOGGLE_SHORT_LABELS[QtyToggle.Composition]);
    await expect(selector).toHaveScreenshot("qty-toggle-select-comp.png");

    await selectOption(page, selector, QTY_TOGGLE_SHORT_LABELS[QtyToggle.Quantity]);
    await expect(selector).toHaveScreenshot("qty-toggle-select-qty.png");

    await selectOption(page, selector, QTY_TOGGLE_SHORT_LABELS[QtyToggle.Percentage]);
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
  test("Select Auto, Active, All, Custom", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const selector = getPropertiesPanelKeyFilterSelectInput(page);
    await expect(selector).toBeVisible();

    await selectOption(page, selector, KeyFilter.Auto);
    await expect(selector).toHaveScreenshot("key-filter-select-auto.png");

    await selectOption(page, selector, KeyFilter.Active);
    await expect(selector).toHaveScreenshot("key-filter-select-active.png");

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

  test("Custom popup full content", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const selector = getPropertiesPanelKeyFilterSelectInput(page);
    await expect(selector).toBeVisible();
    await selectOption(page, selector, KeyFilter.Custom);

    await page.locator("#properties-panel #customize-keys-button").click();
    const popup = page.locator(".popup").first();
    await expect(popup).toBeVisible();

    await expandToFullHeight(page, popup);
    await expect(popup).toHaveScreenshot("key-filter-select-custom-popup-full.png");
  });

  test("Custom popup grouped by hierarchy", async ({ page }) => {
    await goToPageAndWaitFor(page);
    await showHeaderActionButtons(page);

    const selector = getPropertiesPanelKeyFilterSelectInput(page);
    await expect(selector).toBeVisible();
    await selectOption(page, selector, KeyFilter.Custom);

    const modes: [GroupBy, string][] = [
      [GroupBy.GroupedOnce, "grouped-once"],
      [GroupBy.GroupedRepeat, "grouped-repeat"],
    ];

    for (const [mode, suffix] of modes) {
      await selectOption(page, getGroupBySelectInput(page), GROUP_BY_LABELS[mode]);

      await page.locator("#properties-panel #customize-keys-button").click();
      const popup = page.locator(".popup").first();
      await expect(popup).toBeVisible();

      await expandToFullHeight(page, popup);
      await expect(popup).toHaveScreenshot(`key-filter-select-custom-popup-${suffix}.png`);

      // Close before switching modes so the next iteration re-opens the popup fresh.
      await page.keyboard.press("Escape");
    }
  });
});

// ---------------------------------------------------------------------------
// GroupBySelect
// ---------------------------------------------------------------------------

test.describe("Visual Regression: GroupBySelect", () => {
  test("Select Flat, Grouped once, Grouped repeat", async ({ page }) => {
    await goToPageAndWaitFor(page);
    await showHeaderActionButtons(page);

    const selector = getGroupBySelectInput(page);
    await expect(selector).toBeVisible();

    await selectOption(page, selector, GROUP_BY_LABELS[GroupBy.Ungrouped]);
    await expect(selector).toHaveScreenshot("group-by-select-ungrouped.png");

    await selectOption(page, selector, GROUP_BY_LABELS[GroupBy.GroupedOnce]);
    await expect(selector).toHaveScreenshot("group-by-select-grouped-once.png");

    await selectOption(page, selector, GROUP_BY_LABELS[GroupBy.GroupedRepeat]);
    await expect(selector).toHaveScreenshot("group-by-select-grouped-repeat.png");
  });

  test("Popup open", async ({ page }) => {
    await goToPageAndWaitFor(page);
    await showHeaderActionButtons(page);

    const selector = getGroupBySelectInput(page);
    await selector.click();

    const menu = getOpenSelectMenu(page);
    await expect(menu).toBeVisible();
    await expect(menu).toHaveScreenshot("group-by-select-popup.png");
  });

  test("Clicked, hovered", async ({ page }) => {
    await goToPageAndWaitFor(page);
    await showHeaderActionButtons(page);

    const selector = getGroupBySelectInput(page);
    await expect(selector).toBeVisible();

    await selector.click();
    await expect(selector).toHaveScreenshot("group-by-select-clicked.png");

    await page.keyboard.press("Escape");
    await selector.hover();
    await expect(selector).toHaveScreenshot("group-by-select-hovered.png");
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
    await showHeaderActionButtons(page);

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
    await showHeaderActionButtons(page);

    const selector = getSelectControl(page, "#theme-select");
    await selector.click();

    const menu = getOpenSelectMenu(page);
    await expect(menu).toBeVisible();
    await expect(menu).toHaveScreenshot("theme-select-popup.png");
  });

  test("Clicked, hovered", async ({ page }) => {
    await goToPageAndWaitFor(page);
    await showHeaderActionButtons(page);

    const selector = getSelectControl(page, "#theme-select");

    await selector.click();
    await expect(selector).toHaveScreenshot("theme-select-clicked.png");

    await page.keyboard.press("Escape");
    await selector.hover();
    await expect(selector).toHaveScreenshot("theme-select-hovered.png");
  });
});
