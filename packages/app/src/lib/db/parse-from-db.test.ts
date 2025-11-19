import { expect, test } from "vitest";

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";

import { usersTable, ingredientsTable, User } from "./schema";
import * as schema from "./schema";

import {
  into_ingredient_from_spec_js,
  Category,
  Ingredient,
  Composition,
} from "@workspace/sci-cream";

const db = drizzle(process.env.DATABASE_URL!, { schema });

const app: User = {
  name: process.env.APP_USER_NAME!,
  email: process.env.APP_USER_EMAIL!,
};

import { allIngredients } from "../data/ingredients";

async function getAppUserId() {
  const [foundUser] = await db.select().from(usersTable).where(eq(usersTable.email, app.email));

  return foundUser.id;
}

test("Find App user ID", () => {
  expect(getAppUserId()).toBeDefined();
});

test("Create Ingredient from specs from DB", async () => {
  const appUserId = await getAppUserId();

  for (const ing of allIngredients) {
    expect(Category[ing.category as keyof typeof Category]).toBeDefined();

    const [ingDrizzle] = await db
      .select()
      .from(ingredientsTable)
      .where(
        and(
          eq(ingredientsTable.name, ing.name),
          eq(ingredientsTable.user, appUserId),
          eq(ingredientsTable.category, ing.category)
        )
      );

    expect(ingDrizzle).toBeDefined();
    expect(ingDrizzle.name).toBe(ing.name);
    expect(ingDrizzle.user).toBe(appUserId);
    expect(ingDrizzle.category).toBe(ing.category);

    const expectedCategory = Category[ing.category as keyof typeof Category];

    const ingParsed = into_ingredient_from_spec_js(ingDrizzle.spec);
    expect(ingParsed.name).toBe(ing.name);
    expect(ingParsed.category).toBe(expectedCategory);
    expect(ingParsed.composition.solids).toBeDefined();
    expect(ingParsed).toBeInstanceOf(Ingredient);
    expect(ingParsed.composition).toBeInstanceOf(Composition);
  }
});
