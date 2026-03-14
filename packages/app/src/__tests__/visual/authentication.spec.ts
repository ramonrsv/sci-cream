import { test, expect } from "@playwright/test";

import {
  getSigninEmailInput,
  getSigninPasswordInput,
  getSigninWithEmailButton,
  getSignupNameInput,
  getSignupEmailInput,
  getSignupPasswordInput,
  getSignupConfirmPasswordInput,
  getSignupButton,
} from "@/__tests__/e2e/util";

test.describe("Visual Regression: Authentication Pages", () => {
  test("signin page", async ({ page }) => {
    await page.goto("/signin");
    await page.waitForLoadState("networkidle");

    const signin = page.locator("#signin");
    await expect(signin).toBeVisible();

    await expect(signin).toHaveScreenshot("signin.png");
  });

  test("signup page", async ({ page }) => {
    await page.goto("/signup");
    await page.waitForLoadState("networkidle");

    const signup = page.locator("#signup");
    await expect(signup).toBeVisible();

    await expect(signup).toHaveScreenshot("signup.png");
  });

  test("credentials signin error", async ({ page }) => {
    // Suppress the server-side credentials signin error log to keep test output clean.
    await page.route("**/api/auth/callback/credentials**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "/signin?error=CredentialsSignin&code=credentials" }),
      }),
    );

    await page.goto("/signin");
    await page.waitForLoadState("networkidle");

    const signin = page.locator("#signin");
    await expect(signin).toBeVisible();

    const emailInput = getSigninEmailInput(page);
    const passwordInput = getSigninPasswordInput(page);
    const submitButton = getSigninWithEmailButton(page);

    await emailInput.fill("invalid@example.com");
    await passwordInput.fill("invalidpassword");
    await submitButton.click();

    await expect(signin).toHaveScreenshot("signin-credentials-error.png");
  });

  test("signup error, password mismatch", async ({ page }) => {
    await page.goto("/signup");
    await page.waitForLoadState("networkidle");

    const signup = page.locator("#signup");
    await expect(signup).toBeVisible();

    const nameInput = getSignupNameInput(page);
    const emailInput = getSignupEmailInput(page);
    const passwordInput = getSignupPasswordInput(page);
    const confirmPasswordInput = getSignupConfirmPasswordInput(page);
    const submitButton = getSignupButton(page);

    await nameInput.fill("Name");
    await emailInput.fill("name@example.com");
    await passwordInput.fill("password123");
    await confirmPasswordInput.fill("mismatchedpassword");
    await submitButton.click();

    await expect(signup).toHaveScreenshot("signup-error-password-mismatch.png");
  });

  test("signup error, existing email", async ({ page }) => {
    await page.goto("/signup");
    await page.waitForLoadState("networkidle");

    const signup = page.locator("#signup");
    await expect(signup).toBeVisible();

    const nameInput = getSignupNameInput(page);
    const emailInput = getSignupEmailInput(page);
    const passwordInput = getSignupPasswordInput(page);
    const confirmPasswordInput = getSignupConfirmPasswordInput(page);
    const submitButton = getSignupButton(page);

    await nameInput.fill("Tester");
    await emailInput.fill("a.tester@sci-cream.ca");
    await passwordInput.fill("password123");
    await confirmPasswordInput.fill("password123");
    await submitButton.click();

    await expect(signup).toHaveScreenshot("signup-error-existing-email.png");
  });
});
