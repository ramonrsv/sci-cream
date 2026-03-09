import { describe, it, expect, vi, afterEach } from "vitest";

import { sleep_ms, standardInputStepByPercent, verify, verifyAreNotNegative } from "./util";

// ---------------------------------------------------------------------------
// sleep_ms
// ---------------------------------------------------------------------------

describe("sleep_ms", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a Promise", () => {
    const result = sleep_ms(100);
    expect(result).toBeInstanceOf(Promise);
  });

  it("resolves after the specified delay", async () => {
    vi.useFakeTimers();
    const promise = sleep_ms(500);
    vi.advanceTimersByTime(500);
    await expect(promise).resolves.toBeUndefined();
  });

  it("does not resolve before the specified delay", async () => {
    vi.useFakeTimers();
    let resolved = false;
    sleep_ms(500).then(() => {
      resolved = true;
    });
    vi.advanceTimersByTime(499);
    await Promise.resolve(); // flush microtasks
    expect(resolved).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// standardInputStepByPercent
// ---------------------------------------------------------------------------

describe("standardInputStepByPercent", () => {
  it("returns the smallest increment for undefined current", () => {
    expect(standardInputStepByPercent(undefined)).toBe("0.01");
  });

  it("returns various increments based on the current value and default stepPercent", () => {
    // STD = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100]
    for (const [current, expected] of [
      [0.1, "0.01"], // (0.1 * 5) / 100 = 0.005 < 0.01 -> "0.01"
      [0.2, "0.01"], // (0.2 * 5) / 100 = 0.01 == 0.01 -> "0.01"
      [0.5, "0.01"], // (0.5 * 5) / 100 = 0.025 in [0.01, 0.05), < 0.03 mid -> "0.01"
      [0.75, "0.05"], // (0.75 * 5) / 100 = 0.0375 in [0.01, 0.05), > 0.03 mid -> "0.05"
      [1, "0.05"], // (1 * 5) / 100 = 0.05 == 0.05 -> "0.05"
      [10, "0.5"], // (10 * 5) / 100 = 0.5 in in [0.5, 1), < 0.75 mid -> "0.5"
      [15, "1"], // (15 * 5) / 100 = 0.75 in [0.5, 1), == 0.75 mid -> "1"
      [100, "5"], // (100 * 5) / 100 = 5 -> falls in [5, 10), < 7.5 mid -> "5"
    ]) {
      expect(standardInputStepByPercent(current as number), `current=${current}`).toBe(expected);
    }
  });

  it("respects a custom stepPercent", () => {
    // (20 * 10) / 100 = 2 in [2, 5), < 3.5 mid -> "2"
    expect(standardInputStepByPercent(20, 10)).toBe("2");
  });

  it("caps at maxStep: returns last valid increment below maxStep", () => {
    // (1000 * 5) / 100 = 50, but maxStep=10
    expect(standardInputStepByPercent(1000, 5, 10)).toBe("10");
  });

  it("returns the largest valid increment for a very large value", () => {
    // (100000 * 5) / 100 = 5000 > 100 -> "100"
    expect(standardInputStepByPercent(100000)).toBe("100");
  });
});

// ---------------------------------------------------------------------------
// verify
// ---------------------------------------------------------------------------

describe("verify", () => {
  it("does not throw when condition is true", () => {
    expect(() => verify(true, "should not throw")).not.toThrow();
  });

  it("throws an Error when condition is false (string message)", () => {
    expect(() => verify(false, "bad condition")).toThrow("bad condition");
  });

  it("throws an Error when condition is false (function message)", () => {
    const msgFn = () => "computed error message";
    expect(() => verify(false, msgFn)).toThrow("computed error message");
  });

  it("does not call the message function when condition is true", () => {
    const msgFn = vi.fn(() => "should not be called");
    verify(true, msgFn);
    expect(msgFn).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// verifyAreNotNegative
// ---------------------------------------------------------------------------

describe("verifyAreNotNegative", () => {
  it("does not throw for a single valid non-negative number", () => {
    expect(() => verifyAreNotNegative(0)).not.toThrow();
    expect(() => verifyAreNotNegative(42)).not.toThrow();
  });

  it("does not throw for multiple valid non-negative numbers", () => {
    expect(() => verifyAreNotNegative(0, 1, 10, 100)).not.toThrow();
  });

  it("throws when a negative number is passed", () => {
    expect(() => verifyAreNotNegative(-1)).toThrow("must be non-negative");
  });

  it("throws when one of multiple numbers is negative", () => {
    expect(() => verifyAreNotNegative(0, 5, -3, 10)).toThrow("must be non-negative");
  });

  it("throws when undefined is passed", () => {
    expect(() => verifyAreNotNegative(undefined)).toThrow("must be non-negative");
  });

  it("throws when undefined is mixed with valid numbers", () => {
    expect(() => verifyAreNotNegative(1, undefined, 3)).toThrow("must be non-negative");
  });
});
