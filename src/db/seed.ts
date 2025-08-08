import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import { ingredientsTable, usersTable } from "./schema";
import * as schema from "./schema";

import dairy from "../../data/ingredients/dairy.json";

const db = drizzle(process.env.DATABASE_URL!, { schema });

async function main() {
  const serverUser: typeof usersTable.$inferInsert = {
    name: process.env.SERVER_USER_NAME!,
    email: process.env.SERVER_USER_EMAIL!,
  };

  await db
    .insert(usersTable)
    .values(serverUser)
    .onConflictDoNothing({ target: usersTable.email });

  const [{ field1: serverUserId }] = await db
    .select({ field1: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, serverUser.email));

  console.log("Server user ID:", serverUserId);

  const users = await db.select().from(usersTable);
  console.log("Getting all users from the database:", users);

  for (const dataIngredient of dairy) {
    const ingredient: typeof ingredientsTable.$inferInsert = {
      name: dataIngredient.name,
      user: serverUserId,
    };

    console.log("---");
    console.log("Adding ingredient:", ingredient);

    const [existing] = await db
      .select()
      .from(ingredientsTable)
      .where(
        and(
          eq(ingredientsTable.name, ingredient.name),
          eq(ingredientsTable.user, ingredient.user)
        )
      );

    if (existing != undefined) {
      console.log("Found existing ingredient, deleting");

      await db
        .delete(ingredientsTable)
        .where(
          and(
            eq(ingredientsTable.name, ingredient.name),
            eq(ingredientsTable.user, ingredient.user)
          )
        );
    }

    console.log("Inserting ingredient");
    await db.insert(ingredientsTable).values(ingredient);
  }
}

main();
