import { test, expect, Page } from "@playwright/test";

import { RecipeID, getLightRecipe } from "@/__tests__/assets";

import {
  getExpectedRecipeUpdateValues,
  getRecipeUpdateCheckElements,
  pasteRecipeIntoEditor,
  expectRecipePasteCompleted,
  loginAsTestUserWithCredentials,
  goToPageAndWaitFor,
  expandNavbar,
  LoadState,
  fillRecipeAndWaitForUpdate,
} from "@/__tests__/e2e/util";

import { sleep_ms } from "@/lib/util";

import { TEST_USER_B } from "@/lib/database/assets";

test.describe("Recipe Resources", () => {
  // These tests are wall-clock-time sensitive, so we run them serially to avoid flaky failures from
  // parallel test contention; mostly a concern when running locally, as CI runs serially already.
  test.describe.configure({ mode: "serial", timeout: 30000 });

  test("valid-ingredients datalist is present and has options", async ({ page }) => {
    await goToPageAndWaitFor(page);

    const datalist = page.locator("#valid-ingredients");
    await expect(datalist).toBeAttached();
    const optionCount = await page.locator("#valid-ingredients option").count();
    expect(optionCount).toBeGreaterThanOrEqual(88);
  });

  /**
   * Simulates slow fetch API responses, used to validate that UI updates are resilient to slow
   * loading of user-defined ingredient specs, and unaffected if not using user-defined ingredients.
   */
  const simulateSlowFetchApiResponse = async (page: Page, delayMs: number) => {
    await page.route("**/*", async (route) => {
      const method = route.request().method();
      const headers = route.request().headers();

      if (method === "POST" && headers["next-action"]) {
        await sleep_ms(delayMs);
      }

      await route.continue();
    });
  };

  test("recipe without user-defined ingredients should be unaffected by slow fetches", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    // Use a long stall (8000ms) so the threshold below has room to absorb UI driving and parallel
    // worker contention without getting close to a real stall: this path makes no server action, so
    // the delay never fires here — it only sets how slow a *regressed* (stalling) run would be.
    await simulateSlowFetchApiResponse(page, 8000);

    const gotoStart = Date.now();
    await goToPageAndWaitFor(page, "", LoadState.DomContentLoaded);

    for (const recipeId of [RecipeID.Main, RecipeID.RefA, RecipeID.RefB]) {
      await pasteRecipeIntoEditor(page, browserName, recipeId);
    }

    for (const recipeId of [RecipeID.Main, RecipeID.RefA, RecipeID.RefB]) {
      await expectRecipePasteCompleted(page, recipeId);
    }
    const updateTime = Date.now() - gotoStart;

    // A healthy no-stall run (UI driving + worker contention) is ~2-4.5s; a single stalled fetch
    // would add 8000ms (~10s+). 6000ms sits comfortably between the two, so it still proves no
    // server-action stall reached the no-user-defined path while tolerating contention swings.
    expect(updateTime).toBeLessThan(6000);
  });

  // Simulates slow fetch API calls to ensure that recipe paste remains responsive and that the UI
  // updates correctly once the data is available. Should fail if the `useEffect` in `RecipeEditor`
  // to "Prevent stale ingredient rows if pasted quickly whilst... still loading..." is removed.
  test("recipe with user-defined ingredients should be resilient to slow fetches", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === "webkit", "Clipboard API not supported in WebKit/Safari");

    page.on("console", (msg) => {
      console.log(`${msg.text()}`);
    });

    // Use a long stall (8000ms, greater than the threshold in the test with no user-defined
    // ingredients) to ensure tha the test can only succeed once the data from an fetch API request
    // for user-defined ingredients has returned, and not just by a slow but non-stalling run.
    await simulateSlowFetchApiResponse(page, 8000);

    await goToPageAndWaitFor(page);
    await loginAsTestUserWithCredentials(page, TEST_USER_B);

    const gotoStart = Date.now();
    await goToPageAndWaitFor(page, "", LoadState.DomContentLoaded);

    for (const recipeId of [
      RecipeID.MainWithUserDefined,
      RecipeID.RefAWithUserDefined,
      RecipeID.RefBWithUserDefined,
    ]) {
      await pasteRecipeIntoEditor(page, browserName, recipeId);

      const expected = getExpectedRecipeUpdateValues(getLightRecipe(recipeId));
      const elements = await getRecipeUpdateCheckElements(page, recipeId);
      await expect(elements.ingNameInput).toHaveValue(expected.ingName);
      await expect(elements.ingQtyInput).toHaveValue(expected.ingQty);
      await expect(elements.propServingTemp).toBeVisible();
      await expect(elements.propServingTemp).not.toHaveText(expected.servingTemp);
    }
    const pasteTime = Date.now() - gotoStart;

    for (const recipeId of [
      RecipeID.MainWithUserDefined,
      RecipeID.RefAWithUserDefined,
      RecipeID.RefBWithUserDefined,
    ]) {
      await expectRecipePasteCompleted(page, recipeId, undefined, 12000);
    }
    const updateTime = Date.now() - gotoStart;

    // The paste action itself should remain responsive, as it doesn't depend on the fetched data
    expect(pasteTime).toBeLessThan(5000);

    // The update must only pass after the fetch API returns, as the correct calculation values
    // depend on the user-defined ingredient data that only becomes available after the response.
    expect(updateTime).toBeGreaterThan(8000);
  });

  test("client-side navigation between routes issues no further user-data fetches", async ({
    page,
  }) => {
    // Count server-action POSTs (`next-action` header), i.e. the user-data fetches. The provider
    // fetches once per session, so navigation and reads should add none (RSC GETs aren't actions).
    let serverActionCount = 0;
    page.on("request", (req) => {
      if (req.method() === "POST" && req.headers()["next-action"]) serverActionCount++;
    });

    // Sign in and land on the calculator; the provider fetches once per session here. Reset the
    // counter afterward so we measure only what navigation and interaction trigger.
    await goToPageAndWaitFor(page);
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await goToPageAndWaitFor(page);

    expect(serverActionCount).toBeGreaterThan(0);
    serverActionCount = 0;

    await expandNavbar(page);

    /** Click a sidebar nav link (client-side navigation, not a full reload) and await the route. */
    const navigateTo = async (href: string) => {
      await page.locator(`#sidebar a[href="${href}"]`).click();
      await page.waitForURL(`**${href}`);
    };

    /** Select the first search entry, opening its detail panel (which reads the shared bridge). */
    const selectFirstEntry = async () => {
      await page.locator(".search-list-item").first().click();
      await expect(page.locator(".search-detail-panel")).toBeVisible();
    };

    // Navigate and interact with calc -> recipes -> ingredients -> calc; none should fetch.
    await navigateTo("/recipes");
    await selectFirstEntry();

    await navigateTo("/ingredients");
    await selectFirstEntry();

    await navigateTo("/calculator");
    await fillRecipeAndWaitForUpdate(page, RecipeID.RefAWithUserDefined);

    // Let any (regressed) navigation- or interaction-triggered fetch fire before asserting.
    await page.waitForLoadState("networkidle");
    expect(serverActionCount).toBe(0);
  });
});
