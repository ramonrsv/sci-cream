import { expect, test } from "vitest";

import {
  CompKey,
  FpdKey,
  comp_key_as_med_str_js,
  fpd_key_as_med_str_js,
  PropKey,
  PropKeyObj,
  getPropKeys,
  isCompKey,
  isFpdKey,
  prop_key_as_med_str_js,
} from "../../dist/index";

import { getTsEnumNumberKeys, getTsEnumStringKeys } from "./util";

test("Import from sci-cream wasm package, at sci-cream", () => {
  expect(comp_key_as_med_str_js(CompKey.MilkFat)).toBe("Milk Fat");
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
  const compKeys = getTsEnumStringKeys(CompKey);
  const fpdKeys = getTsEnumStringKeys(FpdKey);

  const expectedPropKeys = compKeys.concat(fpdKeys) as PropKey[];
  const propKeys = getPropKeys();

  expect(propKeys).toStrictEqual(expectedPropKeys);

  // getTsEnumStringKeys(PropKeyObj) returns the keys in an arbitrary order
  expect(propKeys).not.toStrictEqual(getTsEnumStringKeys(PropKeyObj));
});

test("prop_key_as_med_str_js works for all PropKey values", () => {
  const propKeys = getPropKeys();

  for (const propKey of propKeys) {
    const medStr = prop_key_as_med_str_js(propKey);
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

test("comp_key_as_med_str_js works for CompKey/FpdKey string values via PropKey", () => {
  const compStrKeys = getTsEnumStringKeys(CompKey);
  const fpdStrKeys = getTsEnumStringKeys(FpdKey);

  for (const compStrKey of compStrKeys) {
    const compKeyMedStr = comp_key_as_med_str_js(CompKey[compStrKey]);
    const propKeyMedStr = prop_key_as_med_str_js(compStrKey as PropKey);
    expect(propKeyMedStr).toBe(compKeyMedStr);
  }

  for (const fpdStrKey of fpdStrKeys) {
    const fpdKeyMedStr = fpd_key_as_med_str_js(FpdKey[fpdStrKey]);
    const propKeyMedStr = prop_key_as_med_str_js(fpdStrKey as PropKey);
    expect(propKeyMedStr).toBe(fpdKeyMedStr);
  }
});

test("comp_key_as_med_str_js works for CompKey/FpdKey number values via PropKey", () => {
  const compNumKeys = getTsEnumNumberKeys(CompKey);
  const fpdNumKeys = getTsEnumNumberKeys(FpdKey);

  for (const compNumKey of compNumKeys) {
    const compKeyMedStr = comp_key_as_med_str_js(compNumKey as CompKey);
    const propKeyMedStr = prop_key_as_med_str_js(CompKey[compNumKey]);
    expect(propKeyMedStr).toBe(compKeyMedStr);
  }

  for (const fpdNumKey of fpdNumKeys) {
    const fpdKeyMedStr = fpd_key_as_med_str_js(fpdNumKey as FpdKey);
    const propKeyMedStr = prop_key_as_med_str_js(FpdKey[fpdNumKey]);
    expect(propKeyMedStr).toBe(fpdKeyMedStr);
  }
});
