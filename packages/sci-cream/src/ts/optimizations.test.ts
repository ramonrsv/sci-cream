import { expect, test } from "vitest";

import { getWasmEnums } from "./util";

import { CompKey, comp_key_as_med_str } from "../../wasm/index";

import { getPropKeys, prop_key_as_med_str } from "./prop-key";

import { compKeyAsMedStr, propKeyAsMedStr } from "./optimizations";

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
