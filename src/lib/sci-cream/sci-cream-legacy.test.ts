import { expect, test } from "vitest";

import { test_ALL } from "./sci-cream-legacy";

test("sci-cream legacy test_ALL runs successfully", () => {
  const result = test_ALL();
  expect(result).toBe(true);
});
