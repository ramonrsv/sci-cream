-- Manual rollback for 0005_rename_cacao_solids. Deliberately outside meta/_journal.json: drizzle
-- has no notion of a down migration, and a file it tracked would be applied as a forward step.
--
-- The app build that predates the migration rejects a chocolate spec's `cocoa_solids`, as the specs
-- deny unknown fields, so rolling back past the migration needs this, with that build redeployed.
--
--   psql "$POSTGRES_URL" -v ON_ERROR_STOP=1 -f drizzle/rollback/0005_rename_cacao_solids.down.sql
--   psql "$POSTGRES_URL" -c "DELETE FROM drizzle.__drizzle_migrations WHERE id = <the 0005 row>"
--
-- It renames every `cocoa_solids` key back, those of specs saved since the migration included.

-- The exact inverse of the migration: the key renamed in the stored JSON text, the rest as stored.
UPDATE "ingredients"
SET "spec" = CASE json_typeof("spec")
  WHEN 'string' THEN
    to_json(regexp_replace("spec" #>> '{}', '"cocoa_solids"(\s*):', '"cacao_solids"\1:', 'g'))
  ELSE regexp_replace("spec"::text, '"cocoa_solids"(\s*):', '"cacao_solids"\1:', 'g')::json
END
WHERE "spec"::text LIKE '%cocoa\_solids%';
