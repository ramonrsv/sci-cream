import { test, expect } from "@playwright/test";

import { Metric } from "@/lib/web-vitals";

declare global {
  interface Window {
    __webVitals: Record<string, Metric>;
  }
}

test("has 'Ice Cream Recipe Calculator' heading", async ({ page }) => {
  await page.goto("");
  await expect(page.getByRole("heading", { name: "Ice Cream Recipe Calculator" })).toBeVisible();
});

test("should collect web vitals metrics and be good", async ({ page }) => {
  await page.goto("");

  await page.waitForLoadState("networkidle");
  await page.waitForLoadState("load");

  // Interact with page to trigger INP/FID
  await page.getByRole("heading", { name: "Ice Cream Recipe Calculator" }).click();
  await page.waitForTimeout(1000);

  const webVitals = await page.evaluate(() => window.__webVitals || {});

  console.log("Web Vitals collected:", Object.keys(webVitals));
  expect(Object.keys(webVitals).length).toBeGreaterThan(0);

  for (const [name, metric] of Object.keys(webVitals).map((key) => [key, webVitals[key]])) {
    console.log(`${name}: ${parseFloat(metric.value.toFixed(2))} (rating: ${metric.rating})`);

    expect(metric).toHaveProperty("value");
    expect(metric).toHaveProperty("rating");
    expect(metric.rating).toEqual("good");
  }
});
