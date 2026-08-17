import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";

import { getDatabaseUrl } from "@/lib/database/util";
import * as schema from "@/lib/database/schema";

/**
 * The Drizzle database client shared by every server-action module.
 *
 * It lives here rather than in one of them because a `"use server"` file may only export async
 * functions, so the client cannot be shared from `data.ts`. Each additional `drizzle()` call opens
 * its own pool, and a serverless invocation that loaded two action modules would hold two.
 */
export const db = drizzle(getDatabaseUrl(), { schema });
