import { expect, test } from "vitest";

import { eq, and } from "drizzle-orm";

import { db } from "@/lib/database/client";
import { findUserByEmail } from "@/lib/data/support/users";
import { ingredientsTable, SchemaCategory } from "@/lib/database/schema";

import {
  getNonAliasIngredientSpecs,
  isSpecEntryIndependent,
  Bridge as WasmBridge,
  new_ingredient_database_seeded_from_specs,
  into_ingredient_from_spec,
  Category,
  Ingredient,
  Composition,
  getIndependentIngredientSpecs,
} from "@workspace/sci-cream";

import { TEST_USER_A } from "@/__tests__/seed-assets";

/**
 * Every non-alias embedded spec reaches the database as a `TEST_USER_A` ingredient, and comes
 * back usable. Needs a seeded database: it reads what `scripts/seed.ts` wrote, not the script.
 */

test("Find TEST_USER_A", async () => {
  expect(await findUserByEmail(TEST_USER_A.email)).toBeDefined();
});

test("Create Ingredient from specs from DB", async () => {
  const user = await findUserByEmail(TEST_USER_A.email);
  if (!user) throw new Error("User not found");

  const bridge = new WasmBridge(
    new_ingredient_database_seeded_from_specs(getIndependentIngredientSpecs()),
  );

  for (const spec of getNonAliasIngredientSpecs()) {
    expect(spec.category).toBeDefined();

    const [ingDrizzle] = await db
      .select()
      .from(ingredientsTable)
      .where(
        and(
          eq(ingredientsTable.name, spec.name),
          eq(ingredientsTable.user, user.id),
          eq(
            ingredientsTable.category,
            spec.category as (typeof SchemaCategory)[keyof typeof SchemaCategory],
          ),
        ),
      );

    expect(ingDrizzle).toBeDefined();
    expect(ingDrizzle.name).toBe(spec.name);
    expect(ingDrizzle.user).toBe(user.id);
    expect(ingDrizzle.category).toBe(spec.category);

    const expectedCategory = Category[spec.category as keyof typeof Category];

    const ingParsed = (() => {
      if (isSpecEntryIndependent(spec)) {
        return into_ingredient_from_spec(ingDrizzle.spec);
      } else {
        return bridge.resolve_into_ingredient_from_spec(ingDrizzle.spec);
      }
    })();

    expect(ingParsed.name).toBe(spec.name);
    expect(ingParsed.category).toBe(expectedCategory);
    expect(ingParsed).toBeInstanceOf(Ingredient);
    expect(ingParsed.composition).toBeInstanceOf(Composition);
  }
});
