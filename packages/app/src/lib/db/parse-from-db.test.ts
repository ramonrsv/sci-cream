import { expect, test } from "vitest";

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";

import { usersTable, ingredientsTable, User, SchemaCategory } from "./schema";
import * as schema from "./schema";

import {
  into_ingredient_from_spec,
  Category,
  Ingredient,
  Composition,
  allIngredientSpecs,
} from "@workspace/sci-cream";

const db = drizzle(process.env.DATABASE_URL!, { schema });

const app: User = { name: process.env.APP_USER_NAME!, email: process.env.APP_USER_EMAIL! };

async function getAppUserId() {
  const [foundUser] = await db.select().from(usersTable).where(eq(usersTable.email, app.email));

  return foundUser.id;
}

test("Find App user ID", () => {
  expect(getAppUserId()).toBeDefined();
});

test("Create Ingredient from specs from DB", async () => {
  const appUserId = await getAppUserId();

  for (const spec of allIngredientSpecs) {
    expect(spec.category).toBeDefined();

    const [ingDrizzle] = await db
      .select()
      .from(ingredientsTable)
      .where(
        and(
          eq(ingredientsTable.name, spec.name),
          eq(ingredientsTable.user, appUserId),
          eq(
            ingredientsTable.category,
            spec.category as (typeof SchemaCategory)[keyof typeof SchemaCategory],
          ),
        ),
      );

    expect(ingDrizzle).toBeDefined();
    expect(ingDrizzle.name).toBe(spec.name);
    expect(ingDrizzle.user).toBe(appUserId);
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
