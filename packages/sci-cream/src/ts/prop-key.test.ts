import { expect, test } from "vitest";

import { getTsEnumNumberKeys, getTsEnumStringKeys, getTsEnumStrings, getWasmEnums } from "./util";

import {
  CompKey,
  RatioKey,
  FpdKey,
  MixProperties,
  comp_key_as_med_str,
  fpd_key_as_med_str,
} from "../../wasm/index";

import {
  PropKey,
  PropKeyObj,
  compToPropKey,
  ratioToPropKey,
  fpdToPropKey,
  isCompKey,
  isRatioKey,
  isFpdKey,
  getPropKeys,
  prop_key_as_med_str,
  prop_key_as_short_str,
  prop_key_as_long_str,
  getMixProperty,
  propToCompKey,
  propToRatioKey,
  propToFpdKey,
  getRatioKeyParts,
  isPropKeyQuantity,
  isPropKeyMixScope,
  getMixScopePropKeys,
} from "./prop-key";

test("Import from sci-cream wasm package, at sci-cream", () => {
  expect(comp_key_as_med_str(CompKey.MilkFat)).toBe("Milk Fat");
});

test("PropKeyObj enum contains all CompKey, RatioKey, and FpdKey values", () => {
  const compStrKeys = getTsEnumStringKeys(CompKey);
  const ratioStrKeys = getTsEnumStringKeys(RatioKey);
  const fpdStrKeys = getTsEnumStringKeys(FpdKey);

  for (const compStrKey of compStrKeys) {
    expect(Object.keys(PropKeyObj)).toContain(compStrKey);
  }

  for (const ratioStrKey of ratioStrKeys) {
    expect(Object.keys(PropKeyObj)).toContain(ratioStrKey);
  }

  for (const fpdStrKey of fpdStrKeys) {
    expect(Object.keys(PropKeyObj)).toContain(fpdStrKey);
  }
});

test("getPropKeys returns all PropKey values in correct order", () => {
  const compKeys = getTsEnumStrings(CompKey);
  const fpdKeys = getTsEnumStrings(FpdKey);
  const ratioKeys = getTsEnumStrings(RatioKey);

  const expectedPropKeys = compKeys.concat(ratioKeys).concat(fpdKeys) as PropKey[];
  const propKeys = getPropKeys();

  expect(propKeys).toStrictEqual(expectedPropKeys);

  // getTsEnumStringKeys(PropKeyObj) returns the keys in an arbitrary order
  expect(propKeys).not.toStrictEqual(getTsEnumStringKeys(PropKeyObj));
});

test("prop_key_as_short_str works for all PropKey values", () => {
  const propKeys = getPropKeys();

  for (const propKey of propKeys) {
    const shortStr = prop_key_as_short_str(propKey);
    expect(typeof shortStr).toBe("string");
    expect(shortStr.length).toBeGreaterThan(0);
  }
});

test("prop_key_as_med_str works for all PropKey values", () => {
  const propKeys = getPropKeys();

  for (const propKey of propKeys) {
    const medStr = prop_key_as_med_str(propKey);
    expect(typeof medStr).toBe("string");
    expect(medStr.length).toBeGreaterThan(0);
  }
});

test("prop_key_as_long_str works for all PropKey values", () => {
  const propKeys = getPropKeys();

  for (const propKey of propKeys) {
    const longStr = prop_key_as_long_str(propKey);
    expect(typeof longStr).toBe("string");
    expect(longStr.length).toBeGreaterThan(0);
  }
});

test("isCompKey, isFpdKey, and isRatioKey work correctly", () => {
  const compKeys = getTsEnumStringKeys(CompKey);
  const ratioKeys = getTsEnumStringKeys(RatioKey);
  const fpdKeys = getTsEnumStringKeys(FpdKey);

  const propKeys = getPropKeys();

  for (const propKey of propKeys) {
    if (isCompKey(propKey)) {
      expect(compKeys).toContain(propKey);
      expect(isFpdKey(propKey)).toBe(false);
      expect(isRatioKey(propKey)).toBe(false);
    } else if (isRatioKey(propKey)) {
      expect(ratioKeys).toContain(propKey);
      expect(isCompKey(propKey)).toBe(false);
      expect(isFpdKey(propKey)).toBe(false);
    } else if (isFpdKey(propKey)) {
      expect(fpdKeys).toContain(propKey);
      expect(isCompKey(propKey)).toBe(false);
      expect(isRatioKey(propKey)).toBe(false);
    } else {
      throw new Error(`PropKey ${String(propKey)} is neither CompKey, RatioKey, nor FpdKey`);
    }
  }
});

test("comp_key_as_med_str works for CompKey/FpdKey string values via PropKey", () => {
  const compStrKeys = getTsEnumStringKeys(CompKey);
  const fpdStrKeys = getTsEnumStringKeys(FpdKey);

  for (const compStrKey of compStrKeys) {
    const compKeyMedStr = comp_key_as_med_str(CompKey[compStrKey]);
    const propKeyMedStr = prop_key_as_med_str(compStrKey as PropKey);
    expect(propKeyMedStr).toBe(compKeyMedStr);
  }

  for (const fpdStrKey of fpdStrKeys) {
    const fpdKeyMedStr = fpd_key_as_med_str(FpdKey[fpdStrKey]);
    const propKeyMedStr = prop_key_as_med_str(fpdStrKey as PropKey);
    expect(propKeyMedStr).toBe(fpdKeyMedStr);
  }
});

test("comp_key_as_med_str works for CompKey/FpdKey number values via PropKey", () => {
  const compNumKeys = getTsEnumNumberKeys(CompKey);
  const fpdNumKeys = getTsEnumNumberKeys(FpdKey);

  for (const compNumKey of compNumKeys) {
    const compKeyMedStr = comp_key_as_med_str(compNumKey as unknown as CompKey);
    const propKeyMedStr = prop_key_as_med_str(CompKey[compNumKey]);
    expect(propKeyMedStr).toBe(compKeyMedStr);
  }

  for (const fpdNumKey of fpdNumKeys) {
    const fpdKeyMedStr = fpd_key_as_med_str(fpdNumKey as unknown as FpdKey);
    const propKeyMedStr = prop_key_as_med_str(FpdKey[fpdNumKey]);
    expect(propKeyMedStr).toBe(fpdKeyMedStr);
  }
});

test("comp_key_as_med_str works for CompKey/FpdKey via comp/fpdToPropKey", () => {
  const compKeys = getWasmEnums(CompKey);
  const fpdKeys = getWasmEnums(FpdKey);

  for (const compKey of compKeys) {
    const compKeyMedStr = comp_key_as_med_str(compKey);
    const propKeyMedStr = prop_key_as_med_str(compToPropKey(compKey));
    expect(propKeyMedStr).toBe(compKeyMedStr);
  }

  for (const fpdKey of fpdKeys) {
    const fpdKeyMedStr = fpd_key_as_med_str(fpdKey);
    const propKeyMedStr = prop_key_as_med_str(fpdToPropKey(fpdKey));
    expect(propKeyMedStr).toBe(fpdKeyMedStr);
  }
});

test("getMixProperty", () => {
  const mixProperties = new MixProperties();

  expect(getMixProperty(mixProperties, "MilkFat")).toBe(0);
  expect(getMixProperty(mixProperties, CompKey[CompKey.MilkFat] as PropKey)).toBe(0);
  expect(getMixProperty(mixProperties, "FPD")).toBe(0);
  expect(getMixProperty(mixProperties, FpdKey[FpdKey.FPD] as PropKey)).toBe(0);
  expect(getMixProperty(mixProperties, compToPropKey(CompKey.MilkFat))).toBe(0);
  expect(getMixProperty(mixProperties, fpdToPropKey(FpdKey.FPD))).toBe(0);
});

test("prop_key_as_med_str throws for invalid PropKey", () => {
  expect(() => prop_key_as_med_str("InvalidPropKey" as PropKey)).toThrow();
});

test("getMixProperty throws for invalid PropKey", () => {
  const mixProperties = new MixProperties();
  expect(() => getMixProperty(mixProperties, "InvalidPropKey" as PropKey)).toThrow();
});

test("propToCompKey returns the correct CompKey for all CompKey PropKeys", () => {
  expect(propToCompKey("MilkFat")).toBe(CompKey.MilkFat);

  for (const key of getWasmEnums(CompKey)) {
    const propKey = compToPropKey(key);
    expect(propToCompKey(propKey)).toBe(key);
  }
});

test("propToCompKey throws for non-CompKey PropKeys", () => {
  for (const key of getWasmEnums(RatioKey)) {
    expect(() => propToCompKey(ratioToPropKey(key))).toThrow("PropKey is not a CompKey");
  }
  for (const key of getWasmEnums(FpdKey)) {
    expect(() => propToCompKey(fpdToPropKey(key))).toThrow("PropKey is not a CompKey");
  }
});

test("propToRatioKey returns the correct RatioKey for all RatioKey PropKeys", () => {
  expect(propToRatioKey("AbsPAC")).toBe(RatioKey.AbsPAC);

  for (const key of getWasmEnums(RatioKey)) {
    const propKey = ratioToPropKey(key);
    expect(propToRatioKey(propKey)).toBe(key);
  }
});

test("propToRatioKey throws for non-RatioKey PropKeys", () => {
  for (const key of getWasmEnums(CompKey)) {
    expect(() => propToRatioKey(compToPropKey(key))).toThrow("PropKey is not a RatioKey");
  }
  for (const key of getWasmEnums(FpdKey)) {
    expect(() => propToRatioKey(fpdToPropKey(key))).toThrow("PropKey is not a RatioKey");
  }
});

test("propToFpdKey returns the correct FpdKey for all FpdKey PropKeys", () => {
  expect(propToFpdKey("FPD")).toBe(FpdKey.FPD);

  for (const key of getWasmEnums(FpdKey)) {
    const propKey = fpdToPropKey(key);
    expect(propToFpdKey(propKey)).toBe(key);
  }
});

test("propToFpdKey throws for non-FpdKey PropKeys", () => {
  for (const key of getWasmEnums(CompKey)) {
    expect(() => propToFpdKey(compToPropKey(key))).toThrow("PropKey is not an FpdKey");
  }
  for (const key of getWasmEnums(RatioKey)) {
    expect(() => propToFpdKey(ratioToPropKey(key))).toThrow("PropKey is not an FpdKey");
  }
});

test("getRatioKeyParts returns each ratio key's numerator and denominator as PropKeys", () => {
  expect(getRatioKeyParts(RatioKey.EmulsifiersPerFat)).toEqual([
    compToPropKey(CompKey.TotalEmulsifiers),
    compToPropKey(CompKey.TotalFats),
  ]);
  expect(getRatioKeyParts(RatioKey.StabilizersPerWater)).toEqual([
    compToPropKey(CompKey.TotalStabilizers),
    compToPropKey(CompKey.Water),
  ]);

  // Every part is a valid CompKey-derived PropKey.
  for (const key of getWasmEnums(RatioKey)) {
    for (const part of getRatioKeyParts(key)) {
      expect(isCompKey(part)).toBe(true);
    }
  }
});

test("isPropKeyQuantity returns true for PropKeys derived from quantity CompKeys", () => {
  const qtyPropKeys: PropKey[] = [
    compToPropKey(CompKey.TotalFats),
    compToPropKey(CompKey.MilkFat),
    compToPropKey(CompKey.Water),
    compToPropKey(CompKey.TotalSolids),
  ];

  for (const key of qtyPropKeys) {
    expect(isPropKeyQuantity(key)).toBe(true);
  }
});

test("isPropKeyQuantity returns false for PropKeys derived from RatioKeys and FpdKeys", () => {
  const nonQtyPropKeys: PropKey[] = [
    ratioToPropKey(RatioKey.AbsPAC),
    ratioToPropKey(RatioKey.EmulsifiersPerFat),
    ratioToPropKey(RatioKey.StabilizersPerWater),
    fpdToPropKey(FpdKey.FPD),
    fpdToPropKey(FpdKey.ServingTemp),
    fpdToPropKey(FpdKey.HardnessAt14C),
  ];

  for (const key of nonQtyPropKeys) {
    expect(isPropKeyQuantity(key)).toBe(false);
  }
});

test("isPropKeyMixScope returns true for non-ratio keys", () => {
  expect(isPropKeyMixScope(compToPropKey(CompKey.MilkFat))).toBe(true);
  expect(isPropKeyMixScope(fpdToPropKey(FpdKey.FPD))).toBe(true);
});

test("isPropKeyMixScope returns true for the current (mix-scoped) ratio keys", () => {
  // The current ratio keys are all mix-scoped, so none are filtered from the mix composition
  expect(isPropKeyMixScope(ratioToPropKey(RatioKey.AbsPAC))).toBe(true);
  expect(isPropKeyMixScope(ratioToPropKey(RatioKey.EmulsifiersPerFat))).toBe(true);
  expect(isPropKeyMixScope(ratioToPropKey(RatioKey.StabilizersPerWater))).toBe(true);
});

test("getMixScopePropKeys returns the mix-scoped subset of getPropKeys", () => {
  const mixScopeKeys = getMixScopePropKeys();
  const allKeys = getPropKeys();

  expect(mixScopeKeys).toEqual(allKeys.filter(isPropKeyMixScope));
  for (const key of mixScopeKeys) expect(isPropKeyMixScope(key)).toBe(true);
});
