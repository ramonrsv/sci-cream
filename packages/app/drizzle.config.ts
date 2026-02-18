import "dotenv/config";

import { defineConfig } from "drizzle-kit";

import { getDatabaseUrl } from "./src/lib/db/util";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: getDatabaseUrl() },
});
