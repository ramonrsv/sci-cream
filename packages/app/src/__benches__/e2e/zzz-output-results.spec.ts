import { test } from "@playwright/test";

import { writeBenchmarkResultsToFile } from "@/__benches__/util";
import { allBenchmarkResultsForUpload } from "@/__benches__/e2e/util";

// Output benchmark results to a JSON file in a format compatible with `github-action-benchmark@v1`,
// collected from shared `allBenchmarkResultsForUpload` across benchmark suites, exported from
// `@/__benches__/e2e/util`. Note, this file is named with a `zzz-` prefix to ensure it runs last.

test("should output benchmark results to file", async () => {
  writeBenchmarkResultsToFile(allBenchmarkResultsForUpload, "bench_output_e2e.json");
});
