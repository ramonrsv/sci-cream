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
