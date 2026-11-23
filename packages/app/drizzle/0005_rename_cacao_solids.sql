-- The chocolate specs' `cacao_solids` field is now `cocoa_solids`. A spec is stored as a JSON
-- string holding the entry's JSON text, as the seed writes it, or as a plain object, so the key is
-- renamed in that text, keeping the rest as stored, its key order included. In JSON text, a string
-- followed by a colon can only be a key.
UPDATE "ingredients"
SET "spec" = CASE json_typeof("spec")
  WHEN 'string' THEN
    to_json(regexp_replace("spec" #>> '{}', '"cacao_solids"(\s*):', '"cocoa_solids"\1:', 'g'))
  ELSE regexp_replace("spec"::text, '"cacao_solids"(\s*):', '"cocoa_solids"\1:', 'g')::json
END
WHERE "spec"::text LIKE '%cacao\_solids%';
