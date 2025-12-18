import { expect, test } from "vitest";

import { CompKey, comp_key_as_med_str_js } from "@workspace/sci-cream";
import { getCompKeys } from "../lib/sci-cream/sci-cream";

test("Import from sci-cream wasm package, at app", () => {
  expect(comp_key_as_med_str_js(CompKey.MilkFat)).toBe("Milk Fat");
});

test("getFlatHeaders returns values usable with wasm package", () => {
  const comp_keys = getCompKeys();

  expect(comp_keys[0]).toBe(CompKey.MilkFat);
  expect(comp_keys[1]).toBe(CompKey.CacaoFat);

  expect(comp_key_as_med_str_js(comp_keys[0])).toBe("Milk Fat");
  expect(comp_key_as_med_str_js(comp_keys[1])).toBe("Cacao Fat");
});
