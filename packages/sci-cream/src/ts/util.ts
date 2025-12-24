export function getTsEnumNumbers<E extends object>(enumObj: E): number[] {
  return Object.values(enumObj).filter((value) => typeof value === "number") as number[];
}

export function getTsEnumStrings<E extends object>(enumObj: E): string[] {
  return Object.values(enumObj).filter((value) => typeof value === "string") as string[];
}

export function tsEnumToStr<E extends object, K extends keyof E>(enumObj: E, key: K): string {
  return enumObj[enumObj[key] as unknown as keyof E] as unknown as string;
}

export function makeStrEnumFromTsEnum<E extends object>(enumObj: E): { [key: string]: string } {
  const result = {} as { [key: string]: string };
  getTsEnumStrings(enumObj).forEach((key) => {
    result[key as unknown as string] = key;
  });
  return Object.freeze(result);
}

export function makeTsEnumToStrConverter<E extends object>(enumObj: E) {
  return function <K extends keyof E>(key: K): string {
    return enumObj[enumObj[key] as unknown as keyof E] as unknown as string;
  };
}

// @todo When these are exported they lose the type information for E, not sure why. Need find a
// way to preserve the type info. For now, these implementations are duplicated at the app source.

export function getTsEnumNumberKeys<E extends object>(enumObj: E): (keyof E)[] {
  return getTsEnumNumbers(enumObj).map((num) => num as unknown as keyof E);
}

export function getTsEnumStringKeys<E extends object>(enumObj: E): (keyof E)[] {
  return getTsEnumStrings(enumObj).map((str) => str as unknown as keyof E);
}

export function getWasmEnums<T extends Record<string, number | string>>(enumObj: T): T[keyof T][] {
  return getTsEnumNumbers(enumObj).map((num) => num as T[keyof T]);
}
