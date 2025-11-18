import { expect, test } from "vitest";

import { FlatHeader, flat_header_as_med_str_js } from "../../dist/index";

test("Import from sci-cream wasm package, at app", () => {
  expect(flat_header_as_med_str_js(FlatHeader[FlatHeader.MilkFats])).toBe(
    "Milk Fats"
  );
});
