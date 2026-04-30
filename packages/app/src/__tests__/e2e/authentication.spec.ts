import { test, expect } from "@playwright/test";

import { loginAsTestUserWithCredentials, goToPageAndWaitFor } from "@/__tests__/e2e/util";
import { TEST_USER_B } from "@/lib/database/util";

test("should be able to login with valid email/password credentials", async ({ page }) => {
  await goToPageAndWaitFor(page);

  await loginAsTestUserWithCredentials(page, TEST_USER_B);
  await expect(page.locator("#user-name")).toHaveText(TEST_USER_B.name);
});
