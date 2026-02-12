import { defineConfig, devices } from "@playwright/test";

import "dotenv/config";

const PORT = process.env.PORT || "3000";

// See https://playwright.dev/docs/test-configuration.
export default defineConfig({
  testDir: "./src/__tests__/e2e",
  fullyParallel: process.env.CI ? false : true /* Opt out of parallel test on CI. */,
  forbidOnly: !!process.env.CI /* Fail CI build if test.only was left in the source code. */,
  retries: process.env.CI ? 2 : 0 /* Retry on CI only */,
  workers: process.env.CI ? 1 : undefined /* Opt out of parallel tests on CI. */,

  /* See https://playwright.dev/docs/test-reporters */
  reporter: [["list"], ["html", { open: "never" }]],

  /* See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL: `http://localhost:${PORT}` /* Base URL to use in `await page.goto('')` */,
    trace: "on-first-retry" /* See https://playwright.dev/docs/trace-viewer */,
  },

  projects: [
    /* Test against desktop browsers. */
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },

    /* Test against mobile viewports. */
    { name: "mobile-chrome", use: { ...devices["Pixel 5"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 12"] } },

    /* Test against branded browsers. */
    // { name: "google-chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    // { name: "microsoft-edge", use: { ...devices["Desktop Edge"], channel: "msedge" } },

    /* Benchmarking project */
    {
      name: "benches",
      testDir: "./src/__benches__/e2e",
      use: { ...devices["Desktop Chrome"] },
      fullyParallel: false /* Disable parallel tests for benchmarks */,
      workers: 1 /* Single worker to avoid interference */,
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: `pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
