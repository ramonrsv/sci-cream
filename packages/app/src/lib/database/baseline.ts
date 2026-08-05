/**
 * Record already-applied migrations in the drizzle bookmark table without executing their SQL.
 *
 * `build-migration-test-db.sh` applies every migration but the newest with `psql`, which writes no
 * bookmarks — so `drizzle-kit migrate` would re-run them over the tables they just created. This
 * writes the rows they would have had, leaving only the newest migration to apply.
 *
 * Usage: `pnpm db:baseline [--through <tag>]`, defaulting to `--through 0000_baseline`.
 */

import { readFileSync } from "node:fs";

import { drizzle } from "drizzle-orm/node-postgres";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { sql } from "drizzle-orm";

import { getDatabaseUrl } from "@/lib/database/util";
import { verify, verifyDefined } from "@/lib/util";

/** Migration folder, matching `out` in `drizzle.config.ts` */
const MIGRATIONS_FOLDER = "./drizzle";

/** Tag recorded when `--through` is omitted; the first migration, which creates the whole schema */
const DEFAULT_THROUGH_TAG = "0000_baseline";

/** One `meta/_journal.json` entry; `when` is the value the bookmark stores as `created_at` */
type JournalEntry = { idx: number; when: number; tag: string };

/** Read the ordered migration tags from `meta/_journal.json` */
function readJournalTags(): string[] {
  const path = `${MIGRATIONS_FOLDER}/meta/_journal.json`;
  const journal = JSON.parse(readFileSync(path, "utf8")) as { entries: JournalEntry[] };
  return journal.entries.map((entry) => entry.tag);
}

/** Parse `--through <tag>` from `process.argv`, falling back to {@link DEFAULT_THROUGH_TAG} */
function parseThroughTag(): string {
  const flagIndex = process.argv.indexOf("--through");
  if (flagIndex === -1) return DEFAULT_THROUGH_TAG;

  const tag = process.argv[flagIndex + 1];
  verifyDefined(tag, "--through requires a migration tag, e.g. --through 0000_baseline");
  return tag;
}

/**
 * Write one bookmark row per migration up to and including `throughTag`.
 *
 * Fails rather than merging when the bookmark table already holds rows: a partially-baselined
 * database needs a human to decide what actually ran, and guessing risks skipping real migrations.
 */
async function baseline(throughTag: string) {
  const db = drizzle(getDatabaseUrl());

  // `readMigrationFiles` walks the journal in order, so its results align index-for-index with the
  // tags — and it owns the hash algorithm `drizzle-kit migrate` will later compare against.
  const tags = readJournalTags();
  const migrations = readMigrationFiles({ migrationsFolder: MIGRATIONS_FOLDER });
  verify(
    tags.length === migrations.length,
    `journal lists ${tags.length} migrations but ${migrations.length} SQL files were read`,
  );

  const throughIndex = tags.indexOf(throughTag);
  verify(throughIndex !== -1, `no migration tagged "${throughTag}" in ${MIGRATIONS_FOLDER}`);

  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS "drizzle"`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  const existing = await db.execute<{ count: string }>(
    sql`SELECT COUNT(*) AS count FROM "drizzle"."__drizzle_migrations"`,
  );
  const existingCount = Number(existing.rows[0].count);
  verify(
    existingCount === 0,
    `"drizzle"."__drizzle_migrations" already holds ${existingCount} row(s); ` +
      `this database is already tracked, so run \`pnpm db:migrate\` instead`,
  );

  for (let i = 0; i <= throughIndex; i++) {
    const { hash, folderMillis } = migrations[i];
    await db.execute(
      sql`INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
          VALUES (${hash}, ${folderMillis})`,
    );
    console.log(`Recorded ${tags[i]} as applied`);
  }

  console.log(`\nBaselined through ${throughTag}. Run \`pnpm db:migrate\` to apply the rest.`);
}

/** Entry point: baseline through the requested tag, then close out the pooled connections */
async function main() {
  await baseline(parseThroughTag());
  process.exit(0);
}

main();
