/** Returns all numeric values of a TypeScript enum object. */
export function getTsEnumNumbers<E extends object>(enumObj: E): number[] {
  return Object.values(enumObj).filter((value) => typeof value === "number") as number[];
}

/** Returns all string values of a TypeScript enum object. */
export function getTsEnumStrings<E extends object>(enumObj: E): string[] {
  return Object.values(enumObj).filter((value) => typeof value === "string") as string[];
}

/** Converts a TypeScript enum key to its string representation via reverse mapping. */
export function tsEnumToStr<E extends object, K extends keyof E>(enumObj: E, key: K): string {
  return enumObj[enumObj[key] as unknown as keyof E] as unknown as string;
}

/** Builds a frozen string-keyed enum object from the string values of a TypeScript enum. */
export function makeStrEnumFromTsEnum<E extends object>(enumObj: E): { [key: string]: string } {
  const result = {} as { [key: string]: string };
  getTsEnumStrings(enumObj).forEach((key) => {
    result[key as unknown as string] = key;
  });
  return Object.freeze(result);
}

/** Returns a function that converts a TypeScript enum key to its string representation. */
export function makeTsEnumToStrConverter<E extends object>(enumObj: E) {
  return function <K extends keyof E>(key: K): string {
    return enumObj[enumObj[key] as unknown as keyof E] as unknown as string;
  };
}

/**
 * Returns the numeric keys of a TypeScript enum object as typed enum members.
 *
 * @todo When exported, this loses type information for `E` — the cause is unclear, need a way to
 * fix it. For now the implementation is duplicated at the app source to preserve type info.
 */
export function getTsEnumNumberKeys<E extends object>(enumObj: E): (keyof E)[] {
  return getTsEnumNumbers(enumObj).map((num) => num as unknown as keyof E);
}

/**
 * Returns the string keys of a TypeScript enum object as typed enum members.
 *
 * @todo When exported, this loses type information for `E` — the cause is unclear, need a way to
 * fix it. For now the implementation is duplicated at the app source to preserve type info.
 */
export function getTsEnumStringKeys<E extends object>(enumObj: E): (keyof E)[] {
  return getTsEnumStrings(enumObj).map((str) => str as unknown as keyof E);
}

/** Returns all numeric enum values from a WASM-bindgen-generated TypeScript enum object. */
export function getWasmEnums<T extends Record<string, number | string>>(enumObj: T): T[keyof T][] {
  return getTsEnumNumbers(enumObj).map((num) => num as T[keyof T]);
}
