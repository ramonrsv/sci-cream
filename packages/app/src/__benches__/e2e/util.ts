export type BenchmarkResult = {
  name: string;
  avg: number;
  min: number;
  max: number;
  stdDev: number;
};

export type BenchmarkResultForUpload = { name: string; unit: string; value: string; range: string };

// Collect all benchmark results for upload at end
export const allBenchmarkResultsForUpload: Array<BenchmarkResultForUpload> = [];

export function analyzeMeasurements(measurements: number[]) {
  const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;

  const min = Math.min(...measurements);
  const max = Math.max(...measurements);

  const stdDev = Math.sqrt(
    measurements.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / measurements.length,
  );

  return { avg, min, max, stdDev };
}

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

export function formatTimeBenchmarkResultForUpload(result: BenchmarkResult) {
  return {
    name: result.name,
    unit: "ms",
    value: result.avg.toFixed(2),
    range: result.stdDev.toFixed(2),
  };
}

export function formatMemoryBenchmarkResultForUpload(result: BenchmarkResult) {
  return {
    name: result.name,
    unit: "MB",
    value: result.avg.toFixed(3),
    range: result.stdDev.toFixed(3),
  };
}

export async function timeExecution(fn: () => Promise<void>, divider: number = 1): Promise<number> {
  const start = Date.now();
  await fn();
  return (Date.now() - start) / divider;
}
