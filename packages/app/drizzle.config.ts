import "dotenv/config";

import { defineConfig } from "drizzle-kit";

import { getDatabaseUrl } from "./src/lib/database/util";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/lib/database/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: getDatabaseUrl() },
});
