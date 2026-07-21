import { test, expect, type Page } from "@playwright/test";

import type { LightRecipe } from "@workspace/sci-cream";

import { RecipeID, getLightRecipe } from "@/__tests__/assets";
import {
  fillRecipeAndWaitForUpdate,
  goToPageAndWaitFor,
  loginAsTestUserWithCredentials,
} from "@/__tests__/e2e/util";
import { setViewportHeightForAllAppContentScreenshot } from "@/__tests__/visual/util";
import { TEST_USER_B } from "@/lib/database/assets";
import { encodeSharePayload, makeSharePayload } from "@/lib/recipe/share";

/** Encode the given recipe into a share link and open it, waiting for the viewer to render. */
async function goToShareLink(
  page: Page,
  name: string,
  rows: LightRecipe,
  options?: { embed?: boolean; evaporation?: number; comments?: string },
) {
  const encoded = await encodeSharePayload(
    makeSharePayload(name, rows, options?.evaporation, options?.comments),
  );
  await goToPageAndWaitFor(page, `${options?.embed ? "/share/embed" : "/share"}#${encoded}`);
  await expect(page.getByTestId("share-viewer")).toBeVisible();
}

test.describe("Visual Regression: Recipe Share Viewer", () => {
  test("share viewer - light", async ({ page }) => {
    await goToShareLink(page, "Shared Main", getLightRecipe(RecipeID.Main), { evaporation: 50 });
    await expect(page.getByTestId("properties-table-pane")).toBeVisible();

    // Fit all content in the viewport: the FPD canvas only rasterizes while on-screen, so an
    // element screenshot of the taller-than-viewport viewer would capture it blank otherwise.
    await setViewportHeightForAllAppContentScreenshot(page);
    await expect(page.getByTestId("share-viewer")).toHaveScreenshot("share-viewer-light.png");
  });

  test("share viewer - dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await goToShareLink(page, "Shared Main", getLightRecipe(RecipeID.Main), { evaporation: 50 });
    await expect(page.getByTestId("properties-table-pane")).toBeVisible();

    await setViewportHeightForAllAppContentScreenshot(page);
    await expect(page.getByTestId("share-viewer")).toHaveScreenshot("share-viewer-dark.png");
  });

  test("share viewer - with comments", async ({ page }) => {
    await goToShareLink(page, "Shared With Notes", getLightRecipe(RecipeID.Main), {
      comments:
        "Age the mix overnight at 4 °C, then churn cold. A pinch of salt lifts the flavour.",
    });
    await expect(page.getByTestId("properties-table-pane")).toBeVisible();

    await setViewportHeightForAllAppContentScreenshot(page);
    await expect(page.getByTestId("share-viewer")).toHaveScreenshot("share-viewer-comments.png");
  });

  test("share viewer - unresolved ingredient state", async ({ page }) => {
    const rows: LightRecipe = [
      ["Whole Milk", 500],
      ["Not A Real Ingredient", 25],
    ];
    await goToShareLink(page, "Partly Unknown", rows);
    await expect(page.getByTestId("share-unresolved-warning")).toBeVisible();

    await expect(page.getByTestId("share-viewer")).toHaveScreenshot("share-viewer-unresolved.png");
  });

  test("share embed - compact layout", async ({ page }) => {
    // The iframe size suggested by the share dialog's copyable snippet
    await page.setViewportSize({ width: 600, height: 675 });
    await goToShareLink(page, "Embedded Main", getLightRecipe(RecipeID.Main), { embed: true });
    await expect(page.getByTestId("properties-table-pane")).toBeVisible();

    await expect(page.getByTestId("share-viewer")).toHaveScreenshot("share-embed.png");
  });
});

test.describe("Visual Regression: Share Dialog", () => {
  test("share dialog - popup", async ({ page }) => {
    await goToPageAndWaitFor(page);
    await fillRecipeAndWaitForUpdate(page, RecipeID.Main);
    await page.getByTestId("share-recipe-button").click();

    const dialog = page.getByTestId("share-dialog");
    await expect(dialog).toBeVisible();
    // Wait for the async encode to populate the link before capturing.
    await expect(page.getByTestId("share-link")).toHaveValue(/\/share#.+/);

    // The link and embed fields carry the origin + payload, which vary by run; mask them so the
    // snapshot pins the dialog's chrome and layout rather than its (dynamic) URL contents.
    await expect(dialog).toHaveScreenshot("share-dialog.png", {
      mask: [page.getByTestId("share-link"), page.getByTestId("share-embed")],
    });
  });

  test("share dialog - with custom ingredients", async ({ page }) => {
    await goToPageAndWaitFor(page);
    // TEST_USER_B owns a "Fructose (User-Defined)" spec; the recipe uses it, so the dialog shows
    // the opt-in consent list for inlining that spec into the link.
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await fillRecipeAndWaitForUpdate(page, RecipeID.MainWithUserDefined);
    await page.getByTestId("share-recipe-button").click();

    const dialog = page.getByTestId("share-dialog");
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId("share-spec-consent")).toBeVisible();
    await expect(page.getByTestId("share-link")).toHaveValue(/\/share#.+/);

    await expect(dialog).toHaveScreenshot("share-dialog-custom-ingredients.png", {
      mask: [page.getByTestId("share-link"), page.getByTestId("share-embed")],
    });
  });
});
