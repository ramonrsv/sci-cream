import * as fs from "fs";
import * as path from "path";

export type BenchmarkResult = {
  name: string;
  avg: number;
  min?: number;
  max?: number;
  stdDev?: number;
};

export type BenchmarkResultForUpload = {
  name: string;
  unit: string;
  value: string;
  range?: string;
};

/** Analyze an array of measurements and return statistical data, e.g. avg, max, min, and stdDev */
export function analyzeMeasurements(measurements: number[]) {
  const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;

  const min = Math.min(...measurements);
  const max = Math.max(...measurements);

  const stdDev = Math.sqrt(
    measurements.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / measurements.length,
  );

  return { avg, min, max, stdDev };
}

/** Format a time benchmark result for upload with `github-action-benchmark`, with unit "ms" */
export function formatTimeBenchmarkResultForUpload(result: BenchmarkResult) {
  return {
    name: result.name,
    unit: "ms",
    value: result.avg.toFixed(2),
    ...(result.stdDev !== undefined ? { range: result.stdDev.toFixed(2) } : {}),
  };
}

/** Format a byte size benchmark result for upload with `github-action-benchmark`*/
export function formatByteSizeBenchmarkResultForUpload(result: BenchmarkResult, unit: "KB" | "MB") {
  const fmtValue = (v: number) =>
    unit === "MB" ? (v / 1024 / 1024).toFixed(2) : (v / 1024).toFixed(2);

  return {
    name: result.name,
    unit,
    value: fmtValue(result.avg),
    ...(result.stdDev !== undefined ? { range: fmtValue(result.stdDev) } : {}),
  };
}

/** Write an array of benchmark results to a JSON file in the `bench-results` directory */
export function writeBenchmarkResultsToFile(results: BenchmarkResultForUpload[], filename: string) {
  const outputDir = path.join(process.cwd(), "bench-results");
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, filename);
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nBenchmark results written to: ${outputPath}`);
}
