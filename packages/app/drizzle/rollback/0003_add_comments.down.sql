-- Manual rollback for 0003_add_comments. Deliberately outside meta/_journal.json: drizzle has no
-- notion of a down migration, and a file it tracked would be applied as a forward step.
--
-- The migration is expand-only, so the app build that predates it runs fine against the migrated
-- schema and this is never needed to unblock a rollback — only to reclaim the tables.
--
--   psql "$POSTGRES_URL" -v ON_ERROR_STOP=1 -f drizzle/rollback/0003_add_comments.down.sql
--   psql "$POSTGRES_URL" -c "DELETE FROM drizzle.__drizzle_migrations WHERE id = <the 0003 row>"
--
-- Every comment and report posted since the migration is destroyed. There is no way back.

-- Reports reference comments, so they go first; the cascade would take them anyway, but dropping
-- in dependency order keeps this readable as the exact inverse of the migration.
DROP TABLE "comment_reports";
DROP TABLE "comments";

-- Only once no column is typed by it — the `comments.subject_type` above was the sole user.
DROP TYPE "public"."comment_subject_type";

ALTER TABLE "users" DROP COLUMN "is_admin";
