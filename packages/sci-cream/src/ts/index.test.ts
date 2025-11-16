import { expect, test } from "vitest";

import { hello_wasm, add } from "../../dist/index";

test("Import from sci-cream wasm package, at sci-cream", () => {
  expect(hello_wasm()).toBe("Hello, wasm!");
  expect(add(2, 3)).toBe(5);
});
