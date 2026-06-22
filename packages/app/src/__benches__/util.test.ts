import { describe, it, expect } from "vitest";

import { analyzeMeasurements } from "@/__benches__/util";

describe("analyzeMeasurements", () => {
  it("trims outliers from the central value when there are enough samples (n >= 10)", () => {
    // One large outlier; the middle-8 average ignores both the 100 and the low extreme.
    const { central, min, max } = analyzeMeasurements([10, 11, 12, 13, 14, 15, 16, 17, 18, 100]);
    expect(central).toBe(14.5); // mean of [11..18]; the raw mean would be 22.6
    expect(min).toBe(10);
    expect(max).toBe(100);
  });

  it("reports the trimmed-sample standard deviation as the spread", () => {
    const { spread } = analyzeMeasurements([10, 11, 12, 13, 14, 15, 16, 17, 18, 100]);
    expect(spread).toBeCloseTo(2.2913, 3); // stdDev of [11..18], outlier excluded
  });

  it("falls back to the median for small samples (3 <= n < 10)", () => {
    expect(analyzeMeasurements([1, 2, 100]).central).toBe(2); // median, not the mean of ~34.3
    expect(analyzeMeasurements([1, 2, 3, 100]).central).toBe(2.5); // mean of the two middle values
  });

  it("uses the plain mean for one or two samples", () => {
    expect(analyzeMeasurements([42]).central).toBe(42);
    expect(analyzeMeasurements([10, 20]).central).toBe(15);
  });

  it("does not mutate the input array", () => {
    const input = [3, 1, 2];
    analyzeMeasurements(input);
    expect(input).toEqual([3, 1, 2]);
  });
});
