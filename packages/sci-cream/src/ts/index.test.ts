import { expect, test } from "vitest";

import { CompKey, comp_key_as_med_str } from "../../dist/index";

test("Import from sci-cream wasm package, at sci-cream", () => {
  expect(comp_key_as_med_str(CompKey.MilkFat)).toBe("Milk Fat");
});
