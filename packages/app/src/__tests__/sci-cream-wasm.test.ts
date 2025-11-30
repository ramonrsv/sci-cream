import { expect, test } from "vitest";

import { FlatHeader, flat_header_as_med_str_js } from "@workspace/sci-cream";
import { getFlatHeaders } from "../lib/deprecated/sci-cream";

test("Import from sci-cream wasm package, at app", () => {
  expect(flat_header_as_med_str_js(FlatHeader.MilkFat)).toBe("Milk Fat");
});

test("getFlatHeaders returns values usable with wasm package", () => {
  const headers = getFlatHeaders();

  expect(headers[0]).toBe(FlatHeader.MilkFat);
  expect(headers[1]).toBe(FlatHeader.CacaoFat);

  expect(flat_header_as_med_str_js(headers[0])).toBe("Milk Fat");
  expect(flat_header_as_med_str_js(headers[1])).toBe("Cacao Fat");
});
