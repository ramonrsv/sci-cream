import * as fs from "node:fs";
import * as path from "node:path";

export type BenchmarkResult = {
  name: string;
  /** The tracked byte count. File sizes are deterministic, so there is no spread. */
  central: number;
};

export type BenchmarkResultForUpload = {
  name: string;
  unit: string;
  value: string;
};

/** Format a byte size benchmark result for upload with `github-action-benchmark` */
export function formatByteSizeBenchmarkResultForUpload(result: BenchmarkResult, unit: "KB" | "MB") {
  const value = unit === "MB" ? result.central / 1024 / 1024 : result.central / 1024;
  return { name: result.name, unit, value: value.toFixed(2) };
}

/** Write an array of benchmark results to a JSON file in the `bench-results` directory */
export function writeBenchmarkResultsToFile(results: BenchmarkResultForUpload[], filename: string) {
  const outputDir = path.join(process.cwd(), "bench-results");
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, filename);
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nBenchmark results written to: ${outputPath}`);
}
