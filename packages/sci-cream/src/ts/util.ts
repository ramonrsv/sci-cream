export function getTsEnumNumbers<E extends object>(enumObj: E): number[] {
  return Object.values(enumObj).filter(value => typeof value === 'number') as number[];
}

export function getTsEnumStrings<E extends object>(enumObj: E): string[] {
  return Object.values(enumObj).filter(value => typeof value === 'string') as string[];
}

export function tsEnumToStr<E extends object, K extends keyof E>(enumObj: E, key: K): string {
  return enumObj[enumObj[key] as unknown as keyof E] as unknown as string;
}

export function makeStrEnumFromTsEnum<E extends object>(enumObj: E): { [key: string]: string } {
  let result = {} as { [key: string]: string };
  getTsEnumStrings(enumObj).forEach((key) => { result[key] = key; });
  return Object.freeze(result);
}

export function makeTsEnumToStrConverter<E extends object>(enumObj: E) {
  return function <K extends keyof E>(key: K): string {
    return enumObj[enumObj[key] as unknown as keyof E] as unknown as string;
  }
}
