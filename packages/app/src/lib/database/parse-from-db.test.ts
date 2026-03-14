import { expect, test } from "vitest";

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";

import { getDatabaseUrl, TEST_USER_A } from "@/lib/database/util";
import { findUserByEmail } from "@/lib/data";
import { ingredientsTable, SchemaCategory } from "@/lib/database/schema";
import * as schema from "./schema";

import {
  into_ingredient_from_spec,
  Category,
  Ingredient,
  Composition,
  allIngredientSpecs,
} from "@workspace/sci-cream";

const db = drizzle(getDatabaseUrl(), { schema });

test("Find TEST_USER_A", async () => {
  expect(await findUserByEmail(TEST_USER_A.email)).toBeDefined();
});

test("Create Ingredient from specs from DB", async () => {
  const userId = (await findUserByEmail(TEST_USER_A.email))!.id;

  for (const spec of allIngredientSpecs) {
    expect(spec.category).toBeDefined();

    const [ingDrizzle] = await db
      .select()
      .from(ingredientsTable)
      .where(
        and(
          eq(ingredientsTable.name, spec.name),
          eq(ingredientsTable.user, userId),
          eq(
            ingredientsTable.category,
            spec.category as (typeof SchemaCategory)[keyof typeof SchemaCategory],
          ),
        ),
      );

    expect(ingDrizzle).toBeDefined();
    expect(ingDrizzle.name).toBe(spec.name);
    expect(ingDrizzle.user).toBe(userId);
    expect(ingDrizzle.category).toBe(spec.category);

    const expectedCategory = Category[spec.category as keyof typeof Category];

    const ingParsed = into_ingredient_from_spec(ingDrizzle.spec);
    expect(ingParsed.name).toBe(spec.name);
    expect(ingParsed.category).toBe(expectedCategory);
    expect(ingParsed.composition.solids).toBeDefined();
    expect(ingParsed).toBeInstanceOf(Ingredient);
    expect(ingParsed.composition).toBeInstanceOf(Composition);
  }
});
