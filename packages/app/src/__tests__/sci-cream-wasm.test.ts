import { expect, test } from "vitest";

import { CompKey, comp_key_as_med_str_js, getWasmEnums } from "@workspace/sci-cream";

test("Import from sci-cream wasm package, at app", () => {
  expect(comp_key_as_med_str_js(CompKey.MilkFat)).toBe("Milk Fat");
});

test("getWasmEnums returns values usable with wasm package", () => {
  const comp_keys = getWasmEnums(CompKey);

  expect(comp_keys[0]).toBe(CompKey.MilkFat);
  expect(comp_keys[1]).toBe(CompKey.CacaoFat);

  expect(comp_key_as_med_str_js(comp_keys[0])).toBe("Milk Fat");
  expect(comp_key_as_med_str_js(comp_keys[1])).toBe("Cacao Fat");
});
