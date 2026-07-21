import { test, expect, type Page } from "@playwright/test";

import type { LightRecipe } from "@workspace/sci-cream";

import { RecipeID, getLightRecipe } from "@/__tests__/assets";
import {
  fillRecipeAndWaitForUpdate,
  getIngredientNameInputAtIdx,
  goToPageAndWaitFor,
  loginAsTestUserWithCredentials,
} from "@/__tests__/e2e/util";
import { TEST_USER_B } from "@/lib/database/assets";
import { encodeSharePayload, makeSharePayload, type SharePayload } from "@/lib/recipe/recipe-share";

// Filling recipes involves many UI updates; generous timeout for parallel/underpowered runs.
const EXPECT_TIMEOUT_MS = 12000;

/** Build a `/share#<payload>` URL (relative to baseURL) for the given recipe data. */
async function makeShareLink(
  name: string,
  rows: LightRecipe,
  evaporation?: number,
  comments?: string,
): Promise<string> {
  return `/share#${await encodeSharePayload(makeSharePayload(name, rows, evaporation, comments))}`;
}

/** Open the editor's share dialog and return the current share-link URL it displays. */
async function getShareLinkFromDialog(page: Page): Promise<string> {
  const linkInput = page.getByTestId("share-link");
  if (!(await linkInput.isVisible())) await page.getByTestId("share-recipe-button").click();
  await expect(linkInput).toHaveValue(/\/share#.+/);
  return await linkInput.inputValue();
}

test.describe("Recipe Share Links", () => {
  test("share link renders the recipe rows, properties, and comments for anyone", async ({
    page,
  }) => {
    const rows = getLightRecipe(RecipeID.Main);
    const link = await makeShareLink("Shared Main", rows, 50, "Ripen overnight before churning.");
    await goToPageAndWaitFor(page, link);

    await expect(page.getByRole("heading", { name: "Shared Main" })).toBeVisible();
    for (const [name] of rows) {
      await expect(page.getByRole("cell", { name: String(name), exact: true })).toBeVisible();
    }

    // Evaporation surfaces in the readout above the table, mix properties are computable (all
    // rows resolve), and the shared comments render read-only below the body.
    await expect(page.getByTitle("Grams of water evaporated during preparation")).toContainText(
      "50",
    );
    await expect(page.getByTestId("properties-table-pane")).toBeVisible();
    await expect(page.getByText("Ripen overnight before churning.")).toBeVisible();
    await expect(page.getByTestId("share-unresolved-warning")).toHaveCount(0);
  });

  test("unresolved ingredients show a warning and are excluded from the mix", async ({ page }) => {
    const rows: LightRecipe = [
      ["Whole Milk", 500],
      ["Not A Real Ingredient", 25],
    ];
    await goToPageAndWaitFor(page, await makeShareLink("Partly Unknown", rows));

    // Properties are still shown, calculated from the rows that resolve (like the editor)
    await expect(page.getByTestId("share-unresolved-warning")).toBeVisible();
    await expect(page.getByTestId("properties-table-pane")).toBeVisible();
    // The unknown row is still listed, flagged with the invalid-ingredient styling
    const unknownCell = page.getByRole("cell", { name: "Not A Real Ingredient" });
    await expect(unknownCell).toBeVisible();
    await expect(unknownCell).toHaveClass(/outline-red-400/);
  });

  test("invalid and unknown-version links surface a friendly error", async ({ page }) => {
    await goToPageAndWaitFor(page, "/share#not-a-valid-payload");
    await expect(page.getByTestId("share-error")).toContainText("invalid or corrupted");

    // Not a valid SharePayload on purpose: simulates a link minted by a newer format version
    const futurePayload = { v: 99, n: "Future", r: [["Whole Milk", 1]] } as unknown as SharePayload;
    const fromTheFuture = await encodeSharePayload(futurePayload);
    await goToPageAndWaitFor(page, `/share#${fromTheFuture}`);
    await expect(page.getByTestId("share-error")).toContainText("newer version");
  });

  test("open in calculator lands the shared recipe in the chosen slot", async ({ page }) => {
    const rows = getLightRecipe(RecipeID.Main);
    await goToPageAndWaitFor(page, await makeShareLink("To Calculator", rows));

    await page.getByRole("button", { name: "Open in calculator" }).click();
    await expect(page).toHaveURL(/\/calculator\?slot=0/);

    await expect(getIngredientNameInputAtIdx(page, 0)).toHaveValue(String(rows[0][0]), {
      timeout: EXPECT_TIMEOUT_MS,
    });
    await expect(page.getByLabel("Recipe name")).toHaveValue("To Calculator");
  });

  test("the editor's share dialog produces a link that round-trips the recipe", async ({
    page,
  }) => {
    await goToPageAndWaitFor(page);
    await fillRecipeAndWaitForUpdate(page, RecipeID.Main, EXPECT_TIMEOUT_MS);
    await page.getByLabel("Recipe name").fill("Dialog Shared");

    const url = await getShareLinkFromDialog(page);
    await goToPageAndWaitFor(page, url);

    await expect(page.getByRole("heading", { name: "Dialog Shared" })).toBeVisible();
    for (const [name] of getLightRecipe(RecipeID.Main)) {
      await expect(page.getByRole("cell", { name: String(name), exact: true })).toBeVisible();
    }
    await expect(page.getByTestId("properties-table-pane")).toBeVisible();
  });

  test("user-defined specs are inlined only with per-ingredient consent", async ({ page }) => {
    await goToPageAndWaitFor(page);
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await fillRecipeAndWaitForUpdate(page, RecipeID.MainWithUserDefined, EXPECT_TIMEOUT_MS);

    await page.getByTestId("share-recipe-button").click();
    const consent = page.getByTestId("share-spec-consent");
    await expect(consent).toBeVisible();
    const checkbox = consent.getByRole("checkbox", { name: "Fructose (User-Defined)" });
    await expect(checkbox).not.toBeChecked(); // sharing a spec is opt-in

    const withoutSpec = await getShareLinkFromDialog(page);
    await checkbox.check();
    const linkInput = page.getByTestId("share-link");
    await expect(linkInput).not.toHaveValue(withoutSpec); // re-encoded with the inlined spec
    const withSpec = await linkInput.inputValue();

    // Without the spec the row cannot resolve for a recipient (fresh context: not logged in),
    // so the viewer warns and computes the mix from the remaining rows only
    await goToPageAndWaitFor(page, withoutSpec);
    await expect(page.getByTestId("share-unresolved-warning")).toBeVisible();

    // With the spec inlined, the full recipe resolves and the warning disappears
    await goToPageAndWaitFor(page, withSpec);
    await expect(page.getByTestId("share-unresolved-warning")).toHaveCount(0);
    await expect(page.getByTestId("properties-table-pane")).toBeVisible();
  });

  test("embed route renders chromeless inside a third-party iframe", async ({ page }, testInfo) => {
    const rows = getLightRecipe(RecipeID.Main);
    const encoded = await encodeSharePayload(makeSharePayload("Embedded", rows));
    const baseURL = testInfo.project.use.baseURL;

    // A genuinely cross-origin parent: 127.0.0.1 vs localhost differ in origin, so CSP
    // `frame-ancestors` is truly exercised. It must be an `http` origin (`about:blank` via
    // `page.setContent` has an opaque origin, which `frame-ancestors *` never matches) and a
    // real loopback response (a `route.fulfill` page has no socket address, so Chrome's Local
    // Network Access check classifies it as public and blocks framing loopback URLs from it).
    await page.goto(`${baseURL?.replace("localhost", "127.0.0.1")}/docs`);
    await page.evaluate(
      ([embedSrc, blockedSrc]) => {
        for (const [id, src] of [
          ["embed", embedSrc],
          ["blocked", blockedSrc],
        ]) {
          const frameEl = document.createElement("iframe");
          frameEl.id = id;
          frameEl.src = src;
          frameEl.width = "600";
          frameEl.height = "675";
          document.body.appendChild(frameEl);
        }
      },
      [`${baseURL}/share/embed#${encoded}`, `${baseURL}/share#${encoded}`],
    );

    const frame = page.frameLocator("#embed");
    // Generous timeout: the first request after a server start can exceed the 5s default
    await expect(frame.getByRole("heading", { name: "Embedded" })).toBeVisible({
      timeout: EXPECT_TIMEOUT_MS,
    });
    await expect(frame.locator("#header")).toHaveCount(0); // no navbar shell
    // No calculator handoff in a third-party frame; a full-view link replaces it
    await expect(frame.getByRole("button", { name: "Open in calculator" })).toHaveCount(0);
    await expect(frame.getByRole("link", { name: "View full recipe" })).toHaveAttribute(
      "href",
      `/share#${encoded}`,
    );

    // The full viewer route must stay un-frameable from third-party origins (clickjacking)
    await expect(page.frameLocator("#blocked").getByTestId("share-viewer")).toHaveCount(0);
  });

  test("only the embed route is served with permissive frame-ancestors", async ({ request }) => {
    const share = await request.get("/share");
    expect(share.headers()["content-security-policy"]).toContain("frame-ancestors 'self'");

    const embed = await request.get("/share/embed");
    expect(embed.headers()["content-security-policy"]).toContain("frame-ancestors *");
  });
});
