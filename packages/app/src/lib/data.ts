"use server";

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";

import { getDatabaseUrl } from "./database/util";
import {
  UserSelect,
  UserInsert,
  usersTable,
  Ingredient as IngredientDb,
  ingredientsTable,
} from "./database/schema";
import * as schema from "./database/schema";

/** Drizzle database client used by all server actions in this module */
const db = drizzle(getDatabaseUrl(), { schema });

/** The database row type used to transfer ingredient data to the client */
export type IngredientTransfer = IngredientDb;

/**
 * Utility class that tracks the number of database fetch calls, used for logging and debugging.
 *
 * @todo Remove or replace with a proper observability solution before production.
 */
class FetchCounter {
  private static count = 0;

  /** Return the current call index and increment the counter */
  static async get() {
    return this.count++;
  }
}

/** Look up a user by email address; returns `undefined` if no matching user exists */
export async function findUserByEmail(email: string): Promise<UserSelect | undefined> {
  console.log(`[${await FetchCounter.get()}] findUserByEmail`);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    console.warn(`findUserByEmail: user not found`);
    return undefined;
  }

  return user;
}

/** Insert a new user; throws if a user with the same email already exists */
export async function insertUser(user: UserInsert): Promise<UserInsert> {
  console.log(`[${await FetchCounter.get()}] insertUser`);

  const existing = await findUserByEmail(user.email);
  if (existing) throw new Error("User with this email already exists");

  const [inserted] = await db.insert(usersTable).values(user).returning();
  return inserted;
}

/**
 * Fetch a single ingredient spec by name for the given user
 *
 * Returns `undefined` if either the user is not found or the ingredient is not found for that user.
 */
export async function fetchUserIngredientSpecByName(
  userEmail: string,
  ingredientName: string,
): Promise<IngredientTransfer | undefined> {
  console.log(`[${await FetchCounter.get()}] fetchUserIngredientSpecByName("${ingredientName}")`);

  const user = await findUserByEmail(userEmail);
  if (!user) {
    console.warn(`fetchUserIngredientSpecByName: user not found`);
    return undefined;
  }

  const ingredient = (
    await db
      .select()
      .from(ingredientsTable)
      .where(and(eq(ingredientsTable.name, ingredientName), eq(ingredientsTable.user, user.id)))
  )[0];

  if (!ingredient) {
    console.warn(
      `fetchUserIngredientSpecByName: ingredient "${ingredientName}" not found for userId=${user.id} `,
    );
    return undefined;
  }

  return ingredient;
}

/** Fetch all ingredient specs belonging to the given user; `undefined` if the user is not found */
export async function fetchAllUserIngredientSpecs(
  userEmail: string,
): Promise<IngredientTransfer[] | undefined> {
  console.log(`[${await FetchCounter.get()}] fetchAllUserIngredientSpecs`);

  const user = await findUserByEmail(userEmail);
  if (!user) {
    console.warn(`fetchAllUserIngredientSpecs: user not found`);
    return undefined;
  }

  const ingredients = await db
    .select()
    .from(ingredientsTable)
    .where(eq(ingredientsTable.user, user.id));

  console.log(
    `fetchAllUserIngredientSpecs: found ${ingredients.length} ingredients for userId=${user.id}`,
  );
  return ingredients;
}
