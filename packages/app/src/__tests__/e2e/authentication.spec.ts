import { test, expect } from "@playwright/test";

import { loginAsTestUserWithCredentials } from "@/__tests__/e2e/util";
import { TEST_USER_B } from "@/lib/database/util";

test("should be able to login with valid email/password credentials", async ({ page }) => {
  await page.goto("");
  await page.waitForLoadState("networkidle");

  await loginAsTestUserWithCredentials(page, TEST_USER_B);
  await expect(page.locator("#user-name")).toHaveText(TEST_USER_B.name);
});
