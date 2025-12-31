import { expect, test } from "vitest";

import { getTsEnumNumberKeys, getTsEnumStringKeys, getTsEnumStrings, getWasmEnums } from "./util";

import {
  CompKey,
  FpdKey,
  MixProperties,
  comp_key_as_med_str,
  fpd_key_as_med_str,
} from "../../wasm/index";

import {
  PropKey,
  PropKeyObj,
  compToPropKey,
  fpdToPropKey,
  isCompKey,
  isFpdKey,
  getPropKeys,
  prop_key_as_med_str,
  getMixProperty,
} from "./prop_key";

test("Import from sci-cream wasm package, at sci-cream", () => {
  expect(comp_key_as_med_str(CompKey.MilkFat)).toBe("Milk Fat");
});

test("PropKeyObj enum contains all CompKey and FpdKey values", () => {
  const compStrKeys = getTsEnumStringKeys(CompKey);
  const fpdStrKeys = getTsEnumStringKeys(FpdKey);

  for (const compStrKey of compStrKeys) {
    expect(Object.keys(PropKeyObj)).toContain(compStrKey);
  }

  for (const fpdStrKey of fpdStrKeys) {
    expect(Object.keys(PropKeyObj)).toContain(fpdStrKey);
  }
});

test("getPropKeys returns all PropKey values in correct order", () => {
  const compKeys = getTsEnumStrings(CompKey);
  const fpdKeys = getTsEnumStrings(FpdKey);

  const expectedPropKeys = compKeys.concat(fpdKeys) as PropKey[];
  const propKeys = getPropKeys();

  expect(propKeys).toStrictEqual(expectedPropKeys);

  // getTsEnumStringKeys(PropKeyObj) returns the keys in an arbitrary order
  expect(propKeys).not.toStrictEqual(getTsEnumStringKeys(PropKeyObj));
});

test("prop_key_as_med_str works for all PropKey values", () => {
  const propKeys = getPropKeys();

  for (const propKey of propKeys) {
    const medStr = prop_key_as_med_str(propKey);
    expect(typeof medStr).toBe("string");
    expect(medStr.length).toBeGreaterThan(0);
  }
});

test("isCompKey and isFpdKey work correctly", () => {
  const compKeys = getTsEnumStringKeys(CompKey);
  const fpdKeys = getTsEnumStringKeys(FpdKey);

  const propKeys = getPropKeys();

  for (const propKey of propKeys) {
    if (isCompKey(propKey)) {
      expect(compKeys).toContain(propKey);
      expect(isFpdKey(propKey)).toBe(false);
    } else if (isFpdKey(propKey)) {
      expect(fpdKeys).toContain(propKey);
      expect(isCompKey(propKey)).toBe(false);
    } else {
      throw new Error(`PropKey ${String(propKey)} is neither CompKey nor FpdKey`);
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
