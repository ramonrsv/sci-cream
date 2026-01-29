import { expect, test } from "vitest";

import { getWasmEnums } from "./util";

import { CompKey, Composition, MixProperties, comp_key_as_med_str } from "../../wasm/index";

import { getPropKeys, prop_key_as_med_str, getMixProperty } from "./prop-key";

import {
  makeCompValueMap,
  makeMixPropValueMap,
  compKeyAsMedStr,
  propKeyAsMedStr,
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
