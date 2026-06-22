import * as fs from "fs";
import * as path from "path";

export type BenchmarkResult = {
  name: string;
  /** Outlier-robust central value (trimmed mean / median); the number tracked on the dashboard */
  central: number;
  min?: number;
  max?: number;
  /** Robust spread of the retained sample; the dashboard's ± error bar */
  spread?: number;
};

export type BenchmarkResultForUpload = {
  name: string;
  unit: string;
  value: string;
  range?: string;
};

/**
 * Summarize measurements with an outlier-robust central value and spread, plus raw min/max
 *
 * `central` trims the top and bottom 10% before averaging once there are enough samples (n >= 10);
 * for smaller samples it falls back to the median (n >= 3) or the plain mean. `spread` is the
 * standard deviation of the retained (trimmed) sample. `min`/`max` are the raw extremes. Warmup
 * runs should already be dropped by the caller — this only guards against sporadic outliers.
 */
export function analyzeMeasurements(measurements: number[]) {
  const sorted = [...measurements].sort((a, b) => a - b);
  const n = sorted.length;

  const trim = Math.floor(n * 0.1);
  const kept = trim >= 1 ? sorted.slice(trim, n - trim) : sorted;

  const keptMean = kept.reduce((a, b) => a + b, 0) / kept.length;
  const spread = Math.sqrt(kept.reduce((s, x) => s + (x - keptMean) ** 2, 0) / kept.length);

  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const central = trim >= 1 ? keptMean : n >= 3 ? median : keptMean;

  return { central, spread, min: sorted[0], max: sorted[n - 1] };
}

/** Format a time benchmark result for upload with `github-action-benchmark`, with unit "ms" */
export function formatTimeBenchmarkResultForUpload(result: BenchmarkResult) {
  return {
    name: result.name,
    unit: "ms",
    value: result.central.toFixed(2),
    ...(result.spread !== undefined ? { range: result.spread.toFixed(2) } : {}),
  };
}

/** Format a byte size benchmark result for upload with `github-action-benchmark`*/
export function formatByteSizeBenchmarkResultForUpload(result: BenchmarkResult, unit: "KB" | "MB") {
  const fmtValue = (v: number) =>
    unit === "MB" ? (v / 1024 / 1024).toFixed(2) : (v / 1024).toFixed(2);

  return {
    name: result.name,
    unit,
    value: fmtValue(result.central),
    ...(result.spread !== undefined ? { range: fmtValue(result.spread) } : {}),
  };
}

/**
 * Format a web-vital benchmark result for upload, tagging it with the metric's unit
 *
 * Unlike the time/byte formatters, web vitals span units (timings in "ms", CLS a unitless "score"),
 * so the caller passes the `unit` per metric. `decimals` controls value/range precision.
 */
export function formatWebVitalResultForUpload(
  result: BenchmarkResult,
  unit: string,
  decimals: number = 2,
) {
  return {
    name: result.name,
    unit,
    value: result.central.toFixed(decimals),
    ...(result.spread !== undefined ? { range: result.spread.toFixed(decimals) } : {}),
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
