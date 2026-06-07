import { expect, test } from "vitest";

import { getWasmEnums } from "./util";

import {
  CompKey,
  RatioKey,
  FpdKey,
  Composition,
  MixProperties,
  comp_key_as_short_str,
  comp_key_as_med_str,
  comp_key_as_long_str,
  ratio_key_as_short_str,
  ratio_key_as_med_str,
  ratio_key_as_long_str,
  fpd_key_as_short_str,
  fpd_key_as_med_str,
  fpd_key_as_long_str,
  composition_value_as_quantity,
  composition_value_as_percentage,
} from "../../wasm/index";

import {
  getPropKeys,
  prop_key_as_short_str,
  prop_key_as_med_str,
  prop_key_as_long_str,
  getMixProperty,
} from "./prop-key";

import {
  makeCompValueMap,
  makeMixPropValueMap,
  compKeyAsShortStr,
  compKeyAsMedStr,
  compKeyAsLongStr,
  ratioKeyAsShortStr,
  ratioKeyAsMedStr,
  ratioKeyAsLongStr,
  fpdKeyAsShortStr,
  fpdKeyAsMedStr,
  fpdKeyAsLongStr,
  propKeyAsShortStr,
  propKeyAsMedStr,
  propKeyAsLongStr,
  compositionValueAsQuantity,
  compositionValueAsPercentage,
} from "./optimizations";

test("makeCompValueMap matches composition.get", () => {
  const composition = new Composition();
  const compValueMap = makeCompValueMap(composition);

  for (const compKey of getWasmEnums(CompKey)) {
    expect(compValueMap.get(compKey)).toBe(composition.get(compKey));
  }
});

test("makeMixPropValueMap matches getMixProperty", () => {
  const mixProperties = new MixProperties();
  const mixPropValueMap = makeMixPropValueMap(mixProperties);

  for (const propKey of getPropKeys()) {
    expect(mixPropValueMap.get(propKey)).toBe(getMixProperty(mixProperties, propKey));
  }
});

test("compositionValueAsQuantity matches composition_value_as_quantity", () => {
  expect(compositionValueAsQuantity(50, 200)).toEqual(composition_value_as_quantity(50, 200));
  expect(compositionValueAsQuantity(0, 150)).toEqual(composition_value_as_quantity(0, 150));
});

test("compositionValueAsPercentage matches composition_value_as_percentage", () => {
  expect(compositionValueAsPercentage(50, 200, 500)).toEqual(
    composition_value_as_percentage(50, 200, 500),
  );
  expect(compositionValueAsPercentage(0, 150, 300)).toEqual(
    composition_value_as_percentage(0, 150, 300),
  );
});

test("compKeyAsShortStr matches comp_key_as_short_str", () => {
  for (const compKey of getWasmEnums(CompKey)) {
    expect(compKeyAsShortStr(compKey)).toBe(comp_key_as_short_str(compKey));
  }
});

test("compKeyAsMedStr matches comp_key_as_med_str", () => {
  for (const compKey of getWasmEnums(CompKey)) {
    expect(compKeyAsMedStr(compKey)).toBe(comp_key_as_med_str(compKey));
  }
});

test("compKeyAsLongStr matches comp_key_as_long_str", () => {
  for (const compKey of getWasmEnums(CompKey)) {
    expect(compKeyAsLongStr(compKey)).toBe(comp_key_as_long_str(compKey));
  }
});

test("ratioKeyAsShortStr matches ratio_key_as_short_str", () => {
  for (const ratioKey of getWasmEnums(RatioKey)) {
    expect(ratioKeyAsShortStr(ratioKey)).toBe(ratio_key_as_short_str(ratioKey));
  }
});

test("ratioKeyAsMedStr matches ratio_key_as_med_str", () => {
  for (const ratioKey of getWasmEnums(RatioKey)) {
    expect(ratioKeyAsMedStr(ratioKey)).toBe(ratio_key_as_med_str(ratioKey));
  }
});

test("ratioKeyAsLongStr matches ratio_key_as_long_str", () => {
  for (const ratioKey of getWasmEnums(RatioKey)) {
    expect(ratioKeyAsLongStr(ratioKey)).toBe(ratio_key_as_long_str(ratioKey));
  }
});

test("fpdKeyAsShortStr matches fpd_key_as_short_str", () => {
  for (const fpdKey of getWasmEnums(FpdKey)) {
    expect(fpdKeyAsShortStr(fpdKey)).toBe(fpd_key_as_short_str(fpdKey));
  }
});

test("fpdKeyAsMedStr matches fpd_key_as_med_str", () => {
  for (const fpdKey of getWasmEnums(FpdKey)) {
    expect(fpdKeyAsMedStr(fpdKey)).toBe(fpd_key_as_med_str(fpdKey));
  }
});

test("fpdKeyAsLongStr matches fpd_key_as_long_str", () => {
  for (const fpdKey of getWasmEnums(FpdKey)) {
    expect(fpdKeyAsLongStr(fpdKey)).toBe(fpd_key_as_long_str(fpdKey));
  }
});

test("propKeyAsShortStr matches prop_key_as_short_str", () => {
  for (const propKey of getPropKeys()) {
    expect(propKeyAsShortStr(propKey)).toBe(prop_key_as_short_str(propKey));
  }
});

test("propKeyAsMedStr matches prop_key_as_med_str", () => {
  for (const propKey of getPropKeys()) {
    expect(propKeyAsMedStr(propKey)).toBe(prop_key_as_med_str(propKey));
  }
});

test("propKeyAsLongStr matches prop_key_as_long_str", () => {
  for (const propKey of getPropKeys()) {
    expect(propKeyAsLongStr(propKey)).toBe(prop_key_as_long_str(propKey));
  }
});
