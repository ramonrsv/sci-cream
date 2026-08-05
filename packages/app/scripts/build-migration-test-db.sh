#!/usr/bin/env bash
#
# build-migration-test-db.sh — Build the state the newest migration will land on.
#
# Applies every migration except the newest, records them as applied, then loads that migration's
# data-only fixture. What remains is a database one migration behind, holding rows — so the
# constraints the newest migration adds validate against something rather than an empty table.
#
# The data cannot come from `seed.ts`: drizzle names every column of the current schema in the
# statements it generates, so seeding a database one migration behind breaks as soon as a migration
# adds a column. See DEVELOPMENT.md for how to generate a fixture.
#
# Usage: POSTGRES_URL=... ./scripts/build-migration-test-db.sh
#
# WARNING: drops and recreates the database `POSTGRES_URL` names, creating it if absent. Point it at
# a throwaway one — CI uses its service container, `run-local-test-suite.sh` a scratch database.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

: "${POSTGRES_URL:?set POSTGRES_URL to the throwaway database to build}"

MIGRATIONS_DIR="drizzle"
JOURNAL="$MIGRATIONS_DIR/meta/_journal.json"

mapfile -t tags < <(jq -r '.entries[].tag' "$JOURNAL")

if [[ "${#tags[@]}" -lt 2 ]]; then
  echo "::error::need at least two migrations to test an upgrade, found ${#tags[@]}"
  exit 1
fi

last="${tags[-1]}"
previous="${tags[-2]}"
fixture="$MIGRATIONS_DIR/fixtures/$last.sql"

if [[ ! -f "$fixture" ]]; then
  echo "::error::$fixture is missing; see DEVELOPMENT.md to generate it"
  exit 1
fi

# The database name is the last path segment, less any `?sslmode=...` riding along with it.
DB="${POSTGRES_URL##*/}"
DB="${DB%%\?*}"

echo "Building the state $last will land on, in $DB"

psql "${POSTGRES_URL%/*}/postgres" -q -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS \"$DB\"" \
  -c "CREATE DATABASE \"$DB\""

for tag in "${tags[@]:0:${#tags[@]}-1}"; do
  echo "  applying $tag"
  psql "$POSTGRES_URL" -q -v ON_ERROR_STOP=1 -f "$MIGRATIONS_DIR/$tag.sql"
done

pnpm db:baseline --through "$previous"

echo "  loading fixture $fixture"
psql "$POSTGRES_URL" -q -v ON_ERROR_STOP=1 -f "$fixture" > /dev/null

echo "Ready: at $previous, holding rows. $last is the only migration left to apply."
