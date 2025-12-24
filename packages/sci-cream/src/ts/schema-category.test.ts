import { expect, test } from "vitest";

import { Category } from "../../wasm/index";
import { getTsEnumStringKeys } from "./util";

import { SchemaCategory } from "./schema-category";

test("SchemaCategory matches Category", () => {
  expect(Object.keys(SchemaCategory)).toEqual(getTsEnumStringKeys(Category));
});
