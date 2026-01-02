import { expect, test } from "vitest";

import { CompKey, comp_key_as_med_str, getWasmEnums } from "@workspace/sci-cream";

test("Import from sci-cream wasm package, at app", () => {
  expect(comp_key_as_med_str(CompKey.MilkFat)).toBe("Milk Fat");
});

test("getWasmEnums returns values usable with wasm package", () => {
  const comp_keys = getWasmEnums(CompKey);

  expect(comp_keys[0]).toBe(CompKey.MilkFat);
  expect(comp_keys[1]).toBe(CompKey.MSNF);

  expect(comp_key_as_med_str(comp_keys[0])).toBe("Milk Fat");
  expect(comp_key_as_med_str(comp_keys[1])).toBe("MSNF");
});
