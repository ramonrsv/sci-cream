import { expect, test } from "vitest";

import { add } from "../dist/index";

test("Import from sci-cream wasm package, at sci-cream", () => {
  const result = add(2, 3);
  expect(result).toBe(5);
});
