import { expect, test } from "vitest";

import { getTsEnumStringKeys } from "../util";

import { SchemaCategory } from "./schema-category";
import { Category } from "@workspace/sci-cream";

test("SchemaCategory matches Category from @workspace/sci-cream", () => {
  expect(getTsEnumStringKeys(SchemaCategory)).toEqual(getTsEnumStringKeys(Category));
});
