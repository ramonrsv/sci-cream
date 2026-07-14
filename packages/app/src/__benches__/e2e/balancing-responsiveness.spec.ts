import { test, expect } from "@playwright/test";

import { CompKey, compToPropKey } from "@workspace/sci-cream";

import {
  setupWatchersForBalancing,
  getWatcherCardTargetInput,
  getWatcherCardIssue,
  getWatchersBalanceButton,
  getWatchersAutoBalanceToggle,
  getWatchersTotalInput,
  getRecipeEditorQtyInputsSignature,
  type WatcherTargetSet,
} from "@/__tests__/e2e/util";

import { formatTimeBenchmarkResultForUpload } from "@/__benches__/util";
import {
  allBenchmarkResultsForUpload,
  doBenchmarkTimeMeasurements as doBenchmarkTimeMeasurementsGeneric,
  timeExecution,
} from "@/__benches__/e2e/util";

const COUNT_TIME_RUNS = 10; // Number of runs for each execution time benchmark

/** Watched property for each bench: balanceable, present in Main, and in the Auto filter set. */
const KEY = compToPropKey(CompKey.TotalSolids);

/** Unreachable total-solids target — surfaces a validation issue on {@link KEY}. */
const ERROR_TARGET = "999";

/** Two pinned batch totals (grams) alternated to force an observable recipe change per balance. */
const TOTAL_A = "1000";
const TOTAL_B = "1200";

/** Distinct pinned totals fired back-to-back to probe rapid auto-balance settle/coalescing. */
const RAPID_TOTALS = Array.from({ length: 50 }, (_, i) => String(1000 + i * 10));

/** The burst's final total, whose settled recipe each run awaits; plus a distinct reset total. */
const RAPID_FINAL_TOTAL = RAPID_TOTALS[RAPID_TOTALS.length - 1];
const RAPID_RESET_TOTAL = "1000";

/** Settle wait for one balance/validation observable; generous to absorb WASM+render jitter. */
const SETTLE_TIMEOUT = 15_000;

/**
 * Target sets to benchmark across: the typical Auto-heuristic selection, and the worst-case valid
 * set of balanceable keys. Both validation and the solve scale with the number of active targets.
 */
const TARGET_SETS: { label: string; set: WatcherTargetSet }[] = [
  { label: "auto", set: "auto" },
  { label: "worst-case", set: "worst" },
];

/**
 * Helper to run time-measurement benchmarks and collect results for upload.
 *
 * Wraps the generic {@link doBenchmarkTimeMeasurements}, providing a fixed run count, formatting
 * results for upload, and pushing them to the shared array output by `zzz-output-results.spec.ts`.
 */
function doBenchmarkTimeMeasurements(name: string, run: () => Promise<number>) {
  return doBenchmarkTimeMeasurementsGeneric(COUNT_TIME_RUNS, name, run).then((result) => {
    allBenchmarkResultsForUpload.push(formatTimeBenchmarkResultForUpload(result));
    return result;
  });
}

test.describe("Balancing Responsiveness Performance Benchmarks", () => {
  test.setTimeout(15 * 60 * 1000);

  // WebKit lacks clipboard support, which the recipe-paste setup relies on.
  test.skip(({ browserName }) => browserName === "webkit", "Clipboard API not supported in WebKit");

  for (const { label, set } of TARGET_SETS) {
    test(`should measure target validation latency (${label})`, async ({ page, browserName }) => {
      await setupWatchersForBalancing(page, browserName, set, KEY);

      const targetInput = getWatcherCardTargetInput(page, KEY);
      const issue = getWatcherCardIssue(page, KEY);
      const metStr = await targetInput.inputValue();

      await doBenchmarkTimeMeasurements(`Target validation (${label})`, async () => {
        // Untimed reset to a valid target so the timed step measures a clean valid -> issue toggle.
        await targetInput.fill(metStr);
        await issue.waitFor({ state: "hidden", timeout: SETTLE_TIMEOUT });

        return timeExecution(async () => {
          await targetInput.fill(ERROR_TARGET);
          await issue.waitFor({ state: "visible", timeout: SETTLE_TIMEOUT });
        });
      });
    });

    test(`should measure balance operation latency (${label})`, async ({ page, browserName }) => {
      await setupWatchersForBalancing(page, browserName, set, KEY);

      const totalInput = getWatchersTotalInput(page);
      const balanceButton = getWatchersBalanceButton(page);

      // Alternate the pinned total so each balance sizes the recipe differently from the previous
      // result, guaranteeing an observable recipe change while the full target set is solved.
      let i = 0;

      await doBenchmarkTimeMeasurements(`Balance operation (${label})`, async () => {
        await totalInput.fill(i++ % 2 === 0 ? TOTAL_A : TOTAL_B); // Untimed: sets the total only.
        const before = await getRecipeEditorQtyInputsSignature(page);

        // Timed round-trip includes the post-solve re-validation, not just the solve: applying the
        // balanced recipe reruns full validation in the render that commits the polled qty inputs.
        return timeExecution(async () => {
          // dispatchEvent avoids click()'s actionability overhead landing in the timed region.
          await balanceButton.dispatchEvent("click");

          await expect
            .poll(() => getRecipeEditorQtyInputsSignature(page), { timeout: SETTLE_TIMEOUT })
            .not.toBe(before);
        });
      });
    });

    test(`should measure auto-balance re-balance latency (${label})`, async ({
      page,
      browserName,
    }) => {
      await setupWatchersForBalancing(page, browserName, set, KEY);

      const autoToggle = getWatchersAutoBalanceToggle(page);
      await autoToggle.click();
      await expect(autoToggle).toHaveAttribute("aria-pressed", "true");

      const totalInput = getWatchersTotalInput(page);
      let i = 0;

      await doBenchmarkTimeMeasurements(`Auto-balance re-balance (${label})`, async () => {
        const before = await getRecipeEditorQtyInputsSignature(page);

        // As with the manual balance, this round-trip includes the post-solve re-validation that
        // reruns in the same render committing the polled qty inputs, not just the solve.
        return timeExecution(async () => {
          // With auto-balance on, changing the pinned total itself triggers the re-balance (timed).
          await totalInput.fill(i++ % 2 === 0 ? TOTAL_A : TOTAL_B);

          await expect
            .poll(() => getRecipeEditorQtyInputsSignature(page), { timeout: SETTLE_TIMEOUT })
            .not.toBe(before);
        });
      });
    });

    test(`should measure auto-balance rapid-update settle (${label})`, async ({
      page,
      browserName,
    }) => {
      await setupWatchersForBalancing(page, browserName, set, KEY);

      const autoToggle = getWatchersAutoBalanceToggle(page);
      await autoToggle.click();
      await expect(autoToggle).toHaveAttribute("aria-pressed", "true");

      const totalInput = getWatchersTotalInput(page);

      // Capture settled signatures once so runs can await each by positive equality; a bare
      // `.not.toBe` could match a transient mid-solve render. Guard that the two states differ.
      const initialSig = await getRecipeEditorQtyInputsSignature(page);
      await totalInput.fill(RAPID_FINAL_TOTAL);
      await expect
        .poll(() => getRecipeEditorQtyInputsSignature(page), { timeout: SETTLE_TIMEOUT })
        .not.toBe(initialSig);
      const finalSig = await getRecipeEditorQtyInputsSignature(page);

      await totalInput.fill(RAPID_RESET_TOTAL);
      await expect
        .poll(() => getRecipeEditorQtyInputsSignature(page), { timeout: SETTLE_TIMEOUT })
        .not.toBe(finalSig);
      const resetSig = await getRecipeEditorQtyInputsSignature(page);

      expect(resetSig).not.toBe(finalSig);

      await doBenchmarkTimeMeasurements(`Auto-balance rapid updates (${label})`, async () => {
        // Untimed: settle at the reset total so the timed run starts from a known state.
        await totalInput.fill(RAPID_RESET_TOTAL);
        await expect
          .poll(() => getRecipeEditorQtyInputsSignature(page), { timeout: SETTLE_TIMEOUT })
          .toBe(resetSig);

        // Timed: fire the burst back-to-back (no await between fills, so intermediate solves may
        // coalesce), then await the final settle. Reports total burst-to-settle, not per-update.
        return timeExecution(async () => {
          for (const total of RAPID_TOTALS) await totalInput.fill(total);

          await expect
            .poll(() => getRecipeEditorQtyInputsSignature(page), { timeout: SETTLE_TIMEOUT })
            .toBe(finalSig);
        });
      });
    });
  }
});
