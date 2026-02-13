import { test, expect, devices } from "@playwright/test";

test.describe("Visual Regression: Responsive Layout", () => {
  const TEST_CASES: {
    name: string;
    viewport: { width: number; height: number };
    screenshot: string;
  }[] = [
    {
      name: "mobile viewport - vertical layout",
      viewport: devices["Pixel 5"].viewport,
      screenshot: "mobile-vertical",
    },
    {
      name: "mobile viewport - horizontal layout",
      viewport: {
        width: devices["Pixel 5"].viewport.height,
        height: devices["Pixel 5"].viewport.width,
      },
      screenshot: "mobile-horizontal",
    },
    {
      name: "tablet viewport - vertical layout",
      viewport: devices["iPad Pro 11"].viewport,
      screenshot: "tablet-vertical",
    },
    {
      name: "tablet viewport - horizontal layout",
      viewport: {
        width: devices["iPad Pro 11"].viewport.height,
        height: devices["iPad Pro 11"].viewport.width,
      },
      screenshot: "tablet-horizontal",
    },
    {
      name: "desktop viewport - 1080p, full screen",
      viewport: { width: 1920, height: 1080 },
      screenshot: "desktop-1920x1080",
    },
    {
      name: "desktop viewport - 1080p, half screen",
      viewport: { width: 960, height: 1080 },
      screenshot: "desktop-960x1080",
    },
    {
      name: "desktop viewport - 1440p, full screen",
      viewport: { width: 2560, height: 1440 },
      screenshot: "desktop-2560x1440",
    },
    {
      name: "desktop viewport - 1440p, half screen",
      viewport: { width: 1280, height: 1440 },
      screenshot: "desktop-1280x1440",
    },
    {
      name: "desktop viewport - 4K UHD, full screen",
      viewport: { width: 3840, height: 2160 },
      screenshot: "desktop-3840x2160",
    },
    {
      name: "desktop viewport - 4K UHD, half screen",
      viewport: { width: 1920, height: 2160 },
      screenshot: "desktop-1920x2160",
    },
  ];

  for (const { name, viewport, screenshot } of TEST_CASES) {
    test(name, async ({ page }) => {
      await page.setViewportSize(viewport);

      await page.goto("");
      await page.waitForLoadState("networkidle");

      // Wait for any animations or dynamic content to settle
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot(`${screenshot}.png`, {
        fullPage: true,
        // Allow a small pixel difference to account for anti-aliasing and rendering variations,
        // particularly on large viewports. This causes some of these tests to fail to catch minor
        // component changes, but it's necessary to prevent false positives in layout tests, and
        // other component-level visual regression tests should catch those minor component changes.
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});
