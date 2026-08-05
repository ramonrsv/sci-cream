-- Manual rollback for 0001_drop_surrogate_keys. Deliberately outside meta/_journal.json: drizzle
-- has no notion of a down migration, and a file it tracked would be applied as a forward step.
--
-- Run this only alongside redeploying the app build that predates the migration — that code names
-- the `id` columns in its generated SQL and fails without them.
--
--   psql "$POSTGRES_URL" -v ON_ERROR_STOP=1 -f drizzle/rollback/0001_drop_surrogate_keys.down.sql
--   psql "$POSTGRES_URL" -c "DELETE FROM drizzle.__drizzle_migrations WHERE id = <the 0001 row>"
--
-- The regenerated `id` values will not match the originals. Nothing ever read them, so this only
-- matters if a future change gives them meaning.

ALTER TABLE "batch_recipes" DROP CONSTRAINT "batch_recipes_version_fk";

ALTER TABLE "batch_recipes" DROP CONSTRAINT "batch_recipes_batch_id_position_pk";
ALTER TABLE "batch_recipes" ADD COLUMN "id" integer GENERATED ALWAYS AS IDENTITY NOT NULL;
ALTER TABLE "batch_recipes" ADD CONSTRAINT "batch_recipes_pkey" PRIMARY KEY ("id");
ALTER TABLE "batch_recipes" ADD CONSTRAINT "batch_recipes_batch_position_uq"
  UNIQUE ("batch_id", "position");

ALTER TABLE "recipe_versions" DROP CONSTRAINT "recipe_versions_recipe_id_version_pk";
ALTER TABLE "recipe_versions" ADD COLUMN "id" integer GENERATED ALWAYS AS IDENTITY NOT NULL;
ALTER TABLE "recipe_versions" ADD CONSTRAINT "recipe_versions_pkey" PRIMARY KEY ("id");
ALTER TABLE "recipe_versions" ADD CONSTRAINT "recipe_versions_recipe_version_uq"
  UNIQUE ("recipe_id", "version");

ALTER TABLE "batch_recipes" ADD CONSTRAINT "batch_recipes_version_fk"
  FOREIGN KEY ("recipe_id", "version_number")
  REFERENCES "public"."recipe_versions" ("recipe_id", "version") ON DELETE set null;
