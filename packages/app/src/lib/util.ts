export const STATE_VAL = 0;
export const STATE_SET = 1;

export function sleep_ms(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const STD_INPUT_INCREMENTS = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100];

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

export function verify(condition: boolean, message: string | (() => string)) {
  if (!condition) {
    throw new Error(typeof message === "function" ? message() : message);
  }
}

export function verifyAreNotNegative(...numbers: (number | undefined)[]) {
  for (const num of numbers) {
    verify(num !== undefined && num >= 0, `${num} must be non-negative`);
  }
}
