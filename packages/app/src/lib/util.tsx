import { getTsEnumStrings, getTsEnumNumbers } from "@workspace/sci-cream";

export const STATE_VAL = 0;
export const STATE_SET = 1;

export function sleep_ms(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getTsEnumNumberKeys<E extends object>(enumObj: E): (keyof E)[] {
  return getTsEnumNumbers(enumObj).map((num) => num as unknown as keyof E);
}

export function getTsEnumStringKeys<E extends object>(enumObj: E): (keyof E)[] {
  return getTsEnumStrings(enumObj).map((str) => str as unknown as keyof E);
}

export function getWasmEnums<E extends object>(enumObj: E): E[] {
  return getTsEnumNumbers(enumObj).map((num) => num as unknown as E);
}

export function standardInputStepByPercent(
  current: number | undefined,
  stepPercent: number = 5,
  maxStep: number = 100
): string {
  const validIncrements = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100];
  const lastIdx = validIncrements.length - 1;

  if (current === undefined || (current * stepPercent) / 100 <= validIncrements[0]) {
    return validIncrements[0].toString();
  }

  for (let i = 0; i < lastIdx; i++) {
    if (
      ((current * stepPercent) / 100 >= validIncrements[i] &&
        (current * stepPercent) / 100 < validIncrements[i + 1]) ||
      validIncrements[i + 1] > maxStep
    ) {
      return validIncrements[i].toString();
    }
  }

  return validIncrements[lastIdx].toString();
}
