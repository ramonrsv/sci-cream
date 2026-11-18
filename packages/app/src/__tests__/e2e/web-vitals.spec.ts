import { test, expect } from "@playwright/test";

import { Metric } from "@/app/_elements/web-vitals";

import { parkCursor } from "@/__tests__/e2e/util";

declare global {
  interface Window {
    __webVitals: Record<string, Metric>;
  }
}

test("should collect web vitals metrics and be good", async ({ page }) => {
  await page.goto("");

  await page.waitForLoadState("networkidle");
  await page.waitForLoadState("load");

  // The cursor may rest on the sidebar's hover zone, whose peek drawer would cover the heading
  await parkCursor(page);

  // Interact with page to trigger INP/FID
  await page.getByRole("heading", { name: "Calculator" }).click();
  await page.waitForTimeout(1000);

  const webVitals = await page.evaluate(() => window.__webVitals || {});

  expect(Object.keys(webVitals).length).toBeGreaterThan(0);

  for (const [metric] of Object.keys(webVitals).map((key) => [webVitals[key]])) {
    expect(metric).toHaveProperty("value");
    expect(metric).toHaveProperty("rating");
    expect(metric.rating).toEqual("good");
  }
});
