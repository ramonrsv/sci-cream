import { expect, test } from "vitest";

import { getWasmEnums } from "./util";

import {
  CompKey,
  Composition,
  MixProperties,
  comp_key_as_med_str,
  composition_value_as_quantity,
  composition_value_as_percentage,
} from "../../wasm/index";

import { getPropKeys, prop_key_as_med_str, getMixProperty } from "./prop-key";

import {
  makeCompValueMap,
  makeMixPropValueMap,
  compKeyAsMedStr,
  propKeyAsMedStr,
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

test("compKeyAsMedStr matches comp_key_as_med_str", () => {
  const compKeys = getWasmEnums(CompKey);

  for (const compKey of compKeys) {
    expect(compKeyAsMedStr(compKey)).toBe(comp_key_as_med_str(compKey));
  }
});

test("propKeyAsMedStr matches prop_key_as_med_str", () => {
  const propKeys = getPropKeys();

  for (const propKey of propKeys) {
    expect(propKeyAsMedStr(propKey)).toBe(prop_key_as_med_str(propKey));
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
