-- Manual rollback for 0002_add_quality_signals. Deliberately outside meta/_journal.json: drizzle
-- has no notion of a down migration, and a file it tracked would be applied as a forward step.
--
-- The migration is expand-only, so the app build that predates it runs fine against the migrated
-- schema and this is never needed to unblock a rollback — only to reclaim the columns.
--
--   psql "$POSTGRES_URL" -v ON_ERROR_STOP=1 -f drizzle/rollback/0002_add_quality_signals.down.sql
--   psql "$POSTGRES_URL" -c "DELETE FROM drizzle.__drizzle_migrations WHERE id = <the 0002 row>"
--
-- Every favourite and rating recorded since the migration is destroyed. There is no way back.

-- The column goes before the type it uses; dropping the type first would be rejected.
ALTER TABLE "recipe_versions" DROP COLUMN "rating";
DROP TYPE "public"."rating";

ALTER TABLE "recipes" DROP COLUMN "favourite";

ALTER TABLE "batches" DROP COLUMN "favourite";
