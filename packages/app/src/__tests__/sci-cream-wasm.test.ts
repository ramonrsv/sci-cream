import { expect, test } from "vitest";

import { FlatHeader, flat_header_as_med_str_js } from "@workspace/sci-cream";

test("Import from sci-cream wasm package, at app", () => {
  expect(flat_header_as_med_str_js(FlatHeader[FlatHeader.MilkFats])).toBe(
    "Milk Fats"
  );
});
