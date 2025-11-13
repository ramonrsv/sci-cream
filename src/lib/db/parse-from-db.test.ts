import { expect, test } from "vitest";

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";

import { usersTable, ingredientsTable, User } from "./schema";
import * as schema from "./schema";

const db = drizzle(process.env.DATABASE_URL!, { schema });

const app: User = {
  name: process.env.APP_USER_NAME!,
  email: process.env.APP_USER_EMAIL!,
};

import {
  Category,
  Ingredient,
  Dairy,
  Sweetener,
  Alcohol,
  Chocolate,
  Nut,
  Fruit,
  Egg,
  Stabilizer,
  Miscellaneous,
} from "@/../src/lib/sci-cream/sci-cream";

import {
  dairy,
  sweeteners,
  alcohol,
  chocolates,
  nuts,
  fruits,
  eggs,
  stabilizers,
  miscellaneous,
} from "@/../data/ingredients/ingredients";

async function getAppUserId() {
  const [foundUser] = await db.select().from(usersTable).where(eq(usersTable.email, app.email));

  return foundUser.id;
}

test("Find App user ID", () => {
  expect(getAppUserId()).toBeDefined();
});

async function testParseIngredientFromDbAndExpectToBe<T extends Ingredient>(
  ctor: new (...args: any) => T,
  category: Category,
  ingredients: any[]
) {
  const appUserId = await getAppUserId();

  test(`Find in database and parse ingredients: ${ctor.name}`, async () => {
    for (const ingObject of ingredients) {
      const [ingDrizzle] = await db
        .select()
        .from(ingredientsTable)
        .where(
          and(
            eq(ingredientsTable.name, ingObject.name),
            eq(ingredientsTable.user, appUserId),
            eq(ingredientsTable.category, category)
          )
        );

      expect(ingDrizzle).toBeDefined();
      expect(ingDrizzle.name).toBe(ingObject.name);
      expect(ingDrizzle.user).toBe(appUserId);
      expect(ingDrizzle.category).toBe(category);

      const ingParsed = new ctor(ingDrizzle.value);
      expect(ingParsed).toStrictEqual(ingObject);
    }
  });
}

await testParseIngredientFromDbAndExpectToBe(Dairy, Category.DAIRY, dairy);
await testParseIngredientFromDbAndExpectToBe(Sweetener, Category.SWEETENER, sweeteners);
await testParseIngredientFromDbAndExpectToBe(Alcohol, Category.ALCOHOL, alcohol);
await testParseIngredientFromDbAndExpectToBe(Chocolate, Category.CHOCOLATE, chocolates);
await testParseIngredientFromDbAndExpectToBe(Nut, Category.NUT, nuts);
await testParseIngredientFromDbAndExpectToBe(Fruit, Category.FRUIT, fruits);
await testParseIngredientFromDbAndExpectToBe(Egg, Category.EGG, eggs);
await testParseIngredientFromDbAndExpectToBe(Stabilizer, Category.STABILIZER, stabilizers);
await testParseIngredientFromDbAndExpectToBe(Miscellaneous, Category.MISCELLANEOUS, miscellaneous);
