import { BenchmarkResultForUpload, analyzeMeasurements } from "@/__benches__/util";

/**
 * This array collects all benchmark results formatted for upload with `github-action-benchmark`.
 *
 * Each benchmark function (e.g. {@link doBenchmarkTimeMeasurements}) can format its result with the
 * appropriate unit (e.g. "ms" for time, "MB" for memory) and push it to this array. Then, at the
 * end of the benchmark suite, results are uploaded to GitHub via `zzz-output-results.spec.ts`. See
 * `@/__benches__/util` for the result formatters.
 */
export const allBenchmarkResultsForUpload: Array<BenchmarkResultForUpload> = [];

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
 * @param run - An async function that performs the benchmark and returns a memory usage in bytes.
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

  const fmtMem = (m: number) =>
    `${Math.round(m / 1024 / 1024)
      .toFixed(0)
      .padStart(4)} MB`;

  console.log(`${name.padEnd(45)} memory: [${fmtMem(min)}, ${fmtMem(avg)}, ${fmtMem(max)}]`);

  return { name, avg, min, max, stdDev };
}

/** Helper function to measure the execution time of an async function in milliseconds */
export async function timeExecution(fn: () => Promise<void>, divider: number = 1): Promise<number> {
  const start = Date.now();
  await fn();
  return (Date.now() - start) / divider;
}
