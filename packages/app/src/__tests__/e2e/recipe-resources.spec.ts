import { test, expect } from "@playwright/test";

test.describe("Recipe Resources", () => {
  test("valid-ingredients datalist is present and has options", async ({ page }) => {
    await page.goto("");
    await page.waitForLoadState("networkidle");

    const datalist = page.locator("#valid-ingredients");
    await expect(datalist).toBeAttached();
    const optionCount = await page.locator("#valid-ingredients option").count();
    expect(optionCount).toBeGreaterThanOrEqual(88);
  });
});
