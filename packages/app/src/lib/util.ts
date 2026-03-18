/** Index of the value in a `useState` tuple */
export const STATE_VAL = 0;
/** Index of the setter in a `useState` tuple */
export const STATE_SET = 1;

/** Returns a promise that resolves after the given number of milliseconds */
export function sleep_ms(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Ordered list of standard input increment values used for number input step snapping */
export const STD_INPUT_INCREMENTS = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100];

/**
 * Return the nearest standard input increment for a number input `step` attribute.
 *
 * The target step is `current * stepPercent / 100`, clamped to `STD_INPUT_INCREMENTS` and snapped
 * to the closest standard value using a midpoint rule. Capped at largest step that's <= `maxStep`.
 *
 * This is used to provide reasonable default step values for quantity inputs based on current
 * values, snapping to a finite set of increments to avoid values that are too small to be useful.
 */
export function standardInputStepByPercent(
  current: number | undefined,
  stepPercent: number = 5,
  maxStep: number = 100,
): string {
  const LAST_IDX = STD_INPUT_INCREMENTS.length - 1;

  if (current === undefined || (current * stepPercent) / 100 <= STD_INPUT_INCREMENTS[0]) {
    return STD_INPUT_INCREMENTS[0].toString();
  }

  for (let i = 0; i < LAST_IDX; i++) {
    if (STD_INPUT_INCREMENTS[i] >= maxStep) {
      return STD_INPUT_INCREMENTS[i].toString();
    }

    const nonStdStep = (current * stepPercent) / 100;

    if (nonStdStep > STD_INPUT_INCREMENTS[i] && nonStdStep <= STD_INPUT_INCREMENTS[i + 1]) {
      const midPoint = (STD_INPUT_INCREMENTS[i] + STD_INPUT_INCREMENTS[i + 1]) / 2;

      return nonStdStep < midPoint
        ? STD_INPUT_INCREMENTS[i].toString()
        : STD_INPUT_INCREMENTS[i + 1].toString();
    }
  }

  return STD_INPUT_INCREMENTS[LAST_IDX].toString();
}

/** Throw an `Error` if `condition` is `false`, with the given message from string or function */
export function verify(condition: boolean, message: string | (() => string)) {
  if (!condition) {
    throw new Error(typeof message === "function" ? message() : message);
  }
}

/** Throw an `Error` if any of the provided numbers are `undefined` or negative */
export function verifyAreNotNegative(...numbers: (number | undefined)[]) {
  for (const num of numbers) {
    verify(num !== undefined && num >= 0, `${num} must be non-negative`);
  }
}
