import { expect, test } from "vitest";

import { Category, getTsEnumStringKeys } from "@workspace/sci-cream";

import { SchemaCategory } from "./schema-category";

test("SchemaCategory matches Category from @workspace/sci-cream", () => {
  expect(getTsEnumStringKeys(SchemaCategory)).toEqual(getTsEnumStringKeys(Category));
});
