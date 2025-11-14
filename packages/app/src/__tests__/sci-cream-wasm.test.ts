import { expect, test } from "vitest";

import { add } from "@workspace/sci-cream";

test("Import from sci-cream wasm package, at app", () => {
  const result = add(2, 3);
  expect(result).toBe(5);
});
