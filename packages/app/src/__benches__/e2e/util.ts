export type BenchmarkResult = {
  name: string;
  avg: number;
  min: number;
  max: number;
  stdDev: number;
};

export type BenchmarkResultForUpload = { name: string; unit: string; value: string; range: string };

/**
 * This array collects all benchmark results formatted for upload with `github-action-benchmark`.
 *
 * Each benchmark function (e.g. {@link doBenchmarkTimeMeasurements}) can format its result with the
 * appropriate unit (e.g. "ms" for time, "MB" for memory) and push it to this array. Then, at the
 * end of the benchmark suite, results are uploaded to GitHub via `zzz-output-results.spec.ts`.
 *
 * @see formatTimeBenchmarkResultForUpload
 * @see formatMemoryBenchmarkResultForUpload
 */
export const allBenchmarkResultsForUpload: Array<BenchmarkResultForUpload> = [];

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

/**
 * Helper function to run time measurements benchmarks and collect statistical data
 *
 * This function runs the provided async function `countRuns` times, collects the time measurements,
 * analyzes them, and returns a computed average, minimum, maximum, and standard deviation.
 *
 * @param countRuns - The number of times to run the benchmarked function
 * @param name - A descriptive name for the benchmark, used for logging and result identification
 * @param run - An async function that performs the benchmark and returns a time measurement in
 * milliseconds; usually the benchmarked code will be wrapped in a call to {@link timeExecution}.
 */
export async function doBenchmarkTimeMeasurements(
  countRuns: number,
  name: string,
  run: () => Promise<number>,
) {
  const measurements: number[] = [];

  for (let i = 0; i < countRuns; i++) {
    measurements.push(await run());
  }

  const { avg, min, max, stdDev } = analyzeMeasurements(measurements);

  const fmtTime = (t: number) => `${Math.round(t).toFixed(0).padStart(4)}ms`;
  console.log(`${name.padEnd(45)} time:   [${fmtTime(min)}, ${fmtTime(avg)}, ${fmtTime(max)}]`);

  return { name, avg, min, max, stdDev };
}

/**
 * Helper function to run memory usage measurements benchmarks and collect statistical data
 *
 * This function runs the provided async function `countRuns` times, collects the memory usage
 * measurements, analyzes them, and returns a computed average, min, max, and standard deviation.
 *
 * @param countRuns - The number of times to run the benchmarked function
 * @param name - A descriptive name for the benchmark, used for logging and result identification
 * @param run - An async function that performs the benchmark and returns a memory usage in MBs.
 */
export async function doBenchmarkMemoryMeasurements(
  countRuns: number,
  name: string,
  run: () => Promise<number>,
) {
  const measurements: number[] = [];

  for (let i = 0; i < countRuns; i++) {
    measurements.push(await run());
  }

  const { avg, min, max, stdDev } = analyzeMeasurements(measurements);

  const fmtMem = (m: number) => `${Math.round(m).toFixed(0).padStart(4)} MB`;
  console.log(`${name.padEnd(45)} memory: [${fmtMem(min)}, ${fmtMem(avg)}, ${fmtMem(max)}]`);

  return { name, avg, min, max, stdDev };
}

/** Format a time benchmark result for upload with `github-action-benchmark`, with unit "ms" */
export function formatTimeBenchmarkResultForUpload(result: BenchmarkResult) {
  return {
    name: result.name,
    unit: "ms",
    value: result.avg.toFixed(2),
    range: result.stdDev.toFixed(2),
  };
}

/** Format a memory benchmark result for upload with `github-action-benchmark`, with unit "MB" */
export function formatMemoryBenchmarkResultForUpload(result: BenchmarkResult) {
  return {
    name: result.name,
    unit: "MB",
    value: result.avg.toFixed(3),
    range: result.stdDev.toFixed(3),
  };
}

/** Helper function to measure the execution time of an async function in milliseconds */
export async function timeExecution(fn: () => Promise<void>, divider: number = 1): Promise<number> {
  const start = Date.now();
  await fn();
  return (Date.now() - start) / divider;
}
