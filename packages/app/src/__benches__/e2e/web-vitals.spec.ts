import { test, expect, type Page } from "@playwright/test";

import type { Metric } from "@/app/_elements/web-vitals";
import { HYDRATION_MARK } from "@/app/_elements/web-vitals-mark";
import { sleep_ms } from "@/lib/util";

import {
  BenchmarkResultForUpload,
  analyzeMeasurements,
  formatWebVitalResultForUpload,
  writeBenchmarkResultsToFile,
} from "@/__benches__/util";

declare global {
  interface Window {
    __webVitals: Record<string, Metric>;
  }
}

const OUTPUT_FILENAME = "bench_output_web_vitals.json";

const COUNT_RUNS = 10; // Page-load cycles to average each metric value over

// CLS is a unitless cumulative layout-shift score; every other metric we track is a millisecond
// timing. CLS values are small, so its score gets more decimal places than the millisecond timings.
const SCORE_METRICS = new Set(["CLS"]);

/** Resolve the upload unit and value precision for a metric by name */
function metricUnitAndDecimals(name: string): {
  unit: string;
  decimalsForUpload: number;
  decimalsForDisplay: number;
} {
  return SCORE_METRICS.has(name)
    ? { unit: "score", decimalsForUpload: 3, decimalsForDisplay: 2 }
    : { unit: "ms", decimalsForUpload: 2, decimalsForDisplay: 0 };
}

// Full names for the acronym web-vitals; Navigation Timing / hydration metrics are already long
const METRIC_EXPANSIONS: Record<string, string> = {
  CLS: "Cumulative Layout Shift",
  FCP: "First Contentful Paint",
  FID: "First Input Delay",
  INP: "Interaction to Next Paint",
  LCP: "Largest Contentful Paint",
  TTFB: "Time to First Byte",
};

/** Console label for a metric: acronyms get their full name appended, others pass through */
function displayName(name: string): string {
  const expansion = METRIC_EXPANSIONS[name];
  return expansion ? `${name} (${expansion})` : name;
}

/**
 * Load the calculator, exercise it, and return all tracked timing values for one page load
 *
 * Merges three sources: `useReportWebVitals` (`window.__webVitals`), Navigation Timing, and the
 * app's `HYDRATION_MARK`. The click generates INP and finalizes LCP; the forced visibility-hidden
 * flush makes web-vitals emit the page-hide metrics (CLS, INP, LCP). Values are read in-browser
 * to avoid serializing each `Metric`'s non-serializable `entries`.
 */
async function collectMetrics(page: Page): Promise<Record<string, number>> {
  await page.goto("");
  await page.waitForLoadState("networkidle");
  await page.waitForLoadState("load");

  // Interact to generate INP and finalize LCP.
  await page.getByRole("heading", { name: "Calculator" }).click();
  await sleep_ms(500);

  // Force a page-hide so web-vitals flushes the page-hide metrics (CLS, INP, LCP) before we read.
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await sleep_ms(500);

  return page.evaluate((hydrationMark) => {
    const out: Record<string, number> = {};
    for (const [name, metric] of Object.entries(window.__webVitals || {})) out[name] = metric.value;

    const [nav] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    if (nav) {
      out["DOM Interactive"] = nav.domInteractive;
      out["DOM Content Loaded"] = nav.domContentLoadedEventEnd;
      out["Load Event End"] = nav.loadEventEnd;
    }

    const [hydration] = performance.getEntriesByName(hydrationMark);
    if (hydration) out["App Hydration (approx)"] = hydration.startTime;

    return out;
  }, HYDRATION_MARK);
}

// "Web Vitals" in this title is what the bench scripts' `--grep` / `--grep-invert` split matches,
// so `bench:web-vitals` runs this in its own track-only CI job, separate from `bench:e2e`.
test.describe("Web Vitals Benchmarks", () => {
  test("should track web vitals values", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);

    const samples = new Map<string, number[]>();

    for (let i = 0; i < COUNT_RUNS; i++) {
      for (const [name, value] of Object.entries(await collectMetrics(page))) {
        const values = samples.get(name) ?? [];
        values.push(value);
        samples.set(name, values);
      }
    }

    // Fail loudly rather than upload an empty file if web-vitals reporting silently breaks.
    expect(samples.size, "no web vitals were captured").toBeGreaterThan(0);

    console.log(`Web Vitals — ${COUNT_RUNS} runs each, [min, avg, max]:`);

    const results: BenchmarkResultForUpload[] = [];
    for (const [name, values] of [...samples].sort(([a], [b]) => a.localeCompare(b))) {
      const { avg, min, max, stdDev } = analyzeMeasurements(values);
      const { unit, decimalsForUpload, decimalsForDisplay } = metricUnitAndDecimals(name);

      const fmt = (v: number) => v.toFixed(decimalsForDisplay).padStart(6);
      console.log(
        `  ${displayName(name).padEnd(34)} [${fmt(min)}, ${fmt(avg)}, ${fmt(max)}] ${unit}`,
      );

      results.push(formatWebVitalResultForUpload({ name, avg, stdDev }, unit, decimalsForUpload));
    }

    writeBenchmarkResultsToFile(results, OUTPUT_FILENAME);
  });
});
