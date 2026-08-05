#!/usr/bin/env bash
#
# verify-migration-on-clone.sh — Rehearse the pending migrations on a copy of production.
#
# Copies production into a local throwaway database and migrates that. The copy carries production's
# own `drizzle.__drizzle_migrations` bookmark, so it receives exactly the set production would,
# against its real schema and its real rows. Production is only ever read from.
#
# `db-migrate.yml` runs this before it migrates production, so anything that would fail there fails
# here first. Run it by hand to rehearse a migration before dispatching that workflow.
#
# Usage: ./scripts/verify-migration-on-clone.sh [--keep-clone]
#
#   --keep-clone   Leave the clone in place afterwards, to inspect what the migration did to it. It
#                  holds a copy of production, real user rows included. A failed run always leaves
#                  it, so the failure can be examined.
#
# Environment:
#   PROD_MIGRATION_POSTGRES_URL     Supabase *session* pooler URL, port 5432. Keep this out of
#                                   packages/app/.env — see DEVELOPMENT.md for why.
#   MIGRATION_CLONE_POSTGRES_URL    Throwaway database to copy into, dropped and recreated on every
#                                   run, so it must be local. Defaults to the development server's
#                                   `sci_cream_prod_clone`.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# shellcheck source=lib/postgres.sh
source "$SCRIPT_DIR/lib/postgres.sh"

# ── Arguments ────────────────────────────────────────────────────────────────

KEEP_CLONE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --keep-clone) KEEP_CLONE=true; shift ;;
    *) die "unknown option: $1 (see the header of this script for usage)" ;;
  esac
done

# ── Preconditions ────────────────────────────────────────────────────────────

require_production_url PROD_MIGRATION_POSTGRES_URL

CLONE_URL="${MIGRATION_CLONE_POSTGRES_URL:-postgres://postgres:password@localhost:5432/sci_cream_prod_clone}"

# The clone is dropped and recreated, so a remote one here would destroy whatever it names.
case "$CLONE_URL" in
  *localhost* | *127.0.0.1*) ;;
  *) die "MIGRATION_CLONE_POSTGRES_URL must be local; this script drops and recreates it" ;;
esac

command -v jq >/dev/null || die "jq not found"

# The database name is the last path segment, less any `?sslmode=...` riding along with it.
CLONE_DB="${CLONE_URL##*/}"
CLONE_DB="${CLONE_DB%%\?*}"
MAINT_URL="${CLONE_URL%/*}/postgres"

prepare_pg_dump PROD_MIGRATION_POSTGRES_URL
require_restore_target "$MAINT_URL" MIGRATION_CLONE_POSTGRES_URL

info "Migrations on this checkout:"
jq -r '.entries[] | "    " + .tag' drizzle/meta/_journal.json

# ── Copy production ──────────────────────────────────────────────────────────

# `drizzle-kit migrate` exits non-zero without printing what Postgres objected to, so the clone is
# kept on failure and replaying the migration by hand on it is what surfaces the error.
on_error() {
  echo >&2
  echo "note: $CLONE_DB was left in place, holding a copy of production." >&2
  echo "      If drizzle-kit gave no reason, replay the migration against it to see one:" >&2
  echo "      psql \"$CLONE_URL\" -v ON_ERROR_STOP=1 -f drizzle/<tag>.sql" >&2
}
trap on_error ERR

info "Rebuilding $CLONE_DB"
psql "$MAINT_URL" -q -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS \"$CLONE_DB\"" \
  -c "CREATE DATABASE \"$CLONE_DB\"" >/dev/null

# The dump carries its own `CREATE SCHEMA public`, which collides with the one a new database gets.
psql "$CLONE_URL" -q -v ON_ERROR_STOP=1 -c 'DROP SCHEMA IF EXISTS public CASCADE' >/dev/null

# `drizzle` holds the migration bookmark, without which the clone would receive every migration
# rather than the pending ones. Supabase's own schemas are managed by Supabase and are not copied.
info "Copying production, PostgreSQL $SERVER_MAJOR, with pg_dump $CLIENT_MAJOR (public, drizzle)"
"$PG_DUMP" "$PROD_MIGRATION_POSTGRES_URL" --no-owner --no-privileges \
  --schema=public --schema=drizzle | psql "$CLONE_URL" -q -v ON_ERROR_STOP=1 >/dev/null

# ── Migrate the copy ─────────────────────────────────────────────────────────

info "Applying pending migrations to $CLONE_DB"
POSTGRES_URL="$CLONE_URL" npx drizzle-kit migrate

psql "$CLONE_URL" -c \
  "SELECT id, left(hash, 12) AS hash, to_timestamp(created_at / 1000) AS recorded
   FROM drizzle.__drizzle_migrations ORDER BY id;"

trap - ERR

if [[ "$KEEP_CLONE" == true ]]; then
  info "Kept $CLONE_DB; it holds a copy of production, so drop it when you are done"
else
  psql "$MAINT_URL" -q -c "DROP DATABASE \"$CLONE_DB\"" >/dev/null
  info "Dropped $CLONE_DB"
fi

echo "Production would take these migrations cleanly."
