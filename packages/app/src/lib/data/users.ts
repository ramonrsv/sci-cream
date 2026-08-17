"use server";

import { eq } from "drizzle-orm";

import { db } from "@/lib/database/client";
import { UserSelect, UserInsert, usersTable } from "@/lib/database/schema";
import { FetchCounter } from "@/lib/data/util";

/**
 * Server actions for user records.
 *
 * @todo These actions, and those in the sibling modules, take the caller's identity as a
 * `userEmail` argument. A server action is an HTTP endpoint, so that argument is a claim the client
 * makes about itself and can name anyone. Migrate them all to `requireUser()` from `./session`,
 * which reads the signed session instead. New actions must use it from the start.
 */

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
