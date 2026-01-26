import { test } from "@playwright/test";

import * as fs from "fs";
import * as path from "path";

import { allBenchmarkResultsForUpload } from "@/__tests__/util";

// Output benchmark results to a JSON file in a format compatible with `github-action-benchmark@v1`,
// collected from shared `allBenchmarkResultsForUpload` across benchmark suites, exported from
// `@/__tests__/util`. Note that this file is named with a `zzz-` prefix to ensure it runs last.

test("should output benchmark results to file", async () => {
  const outputDir = path.join(process.cwd(), "bench-results");
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, "bench_output_ui.json");
  fs.writeFileSync(outputPath, JSON.stringify(allBenchmarkResultsForUpload, null, 2));
  console.log(`\nBenchmark results written to: ${outputPath}`);
});
