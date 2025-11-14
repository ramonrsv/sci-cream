import { expect, test } from "vitest";

import { hello_wasm, add } from "@workspace/sci-cream";

test("Import from sci-cream wasm package, at app", () => {
  expect(hello_wasm()).toBe("Hello, wasm!");

  const result = add(2, 3);
  expect(result).toBe(5);
});
