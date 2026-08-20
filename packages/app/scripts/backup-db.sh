#!/usr/bin/env bash
#
# backup-db.sh — Encrypted, timestamped dumps of the production database.
#
# Take one before every production migration. `age` encrypts the dump on this machine, so a copy
# that later lands on an external drive or in cloud storage is inert without the private key.
#
# Usage:
#   ./scripts/backup-db.sh [--verify] [--keep N] [--out DIR]
#
#   --verify    Restore the fresh dump into a scratch local database and report row counts, before
#               encrypting. A dump that cannot restore still looks like a backup on disk.
#   --keep N    Delete all but the N most recent backups. Omitted, nothing is ever deleted.
#   --out DIR   Destination directory (default ~/backups/sci-cream).
#
# To restore, into a fresh Supabase project or a local database:
#
#   age -d -i <private-key> backup.sql.gz.age | gunzip > restore.sql
#   psql "$URL" -c 'DROP SCHEMA IF EXISTS public CASCADE' -c 'DROP SCHEMA IF EXISTS drizzle CASCADE'
#   psql "$URL" -v ON_ERROR_STOP=1 -f restore.sql
#
# The schemas must be dropped first: the dump creates them itself, and every new database already
# has a `public`. `--verify` restores exactly this way, so the path is exercised on every run.
#
# Environment. What is not already exported is read from ~/.config/sci-cream/prod.env, or from the
# file SCI_CREAM_PROD_ENV names; an exported value always wins over the file.
#
#   PROD_DUMP_POSTGRES_URL         Supabase *session* pooler URL, port 5432. Keep this out of
#                                  packages/app/.env — see DEVELOPMENT.md for why.
#   BACKUP_AGE_RECIPIENT           age public key (age1...). The private key belongs somewhere this
#                                  machine is not, or the encryption buys nothing.
#   BACKUP_VERIFY_POSTGRES_URL     Maintenance connection --verify uses to create its scratch
#                                  database. Must be at production's major version, since Postgres
#                                  does not restore into an older one. Defaults to the local
#                                  development server described in DEVELOPMENT.md.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# shellcheck source=lib/postgres.sh
source "$SCRIPT_DIR/lib/postgres.sh"
# shellcheck source=lib/env.sh
source "$SCRIPT_DIR/lib/env.sh"

load_prod_env

# ── Arguments ────────────────────────────────────────────────────────────────

VERIFY=false
KEEP=""   # empty means keep every backup; deleting one is always something you asked for
OUT_DIR="${HOME}/backups/sci-cream"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --verify) VERIFY=true; shift ;;
    --keep)   KEEP="${2:-}"; [[ -n "$KEEP" ]] || die "--keep requires a count"; shift 2 ;;
    --out)    OUT_DIR="${2:-}"; [[ -n "$OUT_DIR" ]] || die "--out requires a directory"; shift 2 ;;
    *)        die "unknown option: $1 (see the header of this script for usage)" ;;
  esac
done

if [[ -n "$KEEP" ]]; then
  [[ "$KEEP" =~ ^[0-9]+$ ]] || die "--keep must be a whole number, got '$KEEP'"
  # `--keep 0` would delete every backup, including the one this run is about to write.
  (( KEEP >= 1 )) || die "--keep must be at least 1; omit it to keep every backup"
fi

# ── Preconditions ────────────────────────────────────────────────────────────

require_production_url PROD_DUMP_POSTGRES_URL
: "${BACKUP_AGE_RECIPIENT:?set BACKUP_AGE_RECIPIENT to an age public key (age1...)}"

# The repository is public, so a dump inside the working tree is one `git add -A` from being pushed.
case "$(cd "$(dirname "$OUT_DIR")" 2>/dev/null && pwd)/$(basename "$OUT_DIR")" in
  "$REPO_ROOT"/*) die "refusing to write backups inside the repository ($OUT_DIR)" ;;
esac

command -v age >/dev/null || die "age not found; install with: sudo apt install age"

prepare_pg_dump PROD_DUMP_POSTGRES_URL

MAINT_URL="${BACKUP_VERIFY_POSTGRES_URL:-postgres://postgres:password@localhost:5432/postgres}"
if [[ "$VERIFY" == true ]]; then
  require_restore_target "$MAINT_URL" BACKUP_VERIFY_POSTGRES_URL
fi

mkdir -p "$OUT_DIR"

# ── Dump ─────────────────────────────────────────────────────────────────────

STAMP="$(date +%Y%m%d-%H%M%S)"
PLAIN="$(mktemp -t "sci-cream-$STAMP.XXXXXX.sql")"
chmod 600 "$PLAIN"
trap 'rm -f "$PLAIN"' EXIT

# `public` holds the app's tables; `drizzle` holds the migration bookmark, so a restore knows which
# migrations it has already had. Supabase's own schemas are managed by Supabase and are not dumped.
info "Dumping PostgreSQL $SERVER_MAJOR with pg_dump $CLIENT_MAJOR (public, drizzle)"
"$PG_DUMP" "$PROD_DUMP_POSTGRES_URL" \
  --no-owner --no-privileges --schema=public --schema=drizzle > "$PLAIN"

PLAIN_BYTES="$(wc -c < "$PLAIN")"
(( PLAIN_BYTES > 0 )) || die "pg_dump produced an empty file"
info "Dumped $(numfmt --to=iec "$PLAIN_BYTES")"

# ── Verify ───────────────────────────────────────────────────────────────────

if [[ "$VERIFY" == true ]]; then
  # Verifying before encryption keeps the age private key out of this machine entirely.
  SCRATCH="sci_cream_verify_$STAMP"

  info "Restoring into $SCRATCH"
  psql "$MAINT_URL" -q -c "CREATE DATABASE \"$SCRATCH\"" >/dev/null
  SCRATCH_URL="${MAINT_URL%/*}/$SCRATCH"

  # The dump carries its own `CREATE SCHEMA public`, which collides with the one every new database
  # gets. Dropping it first is what restoring into a fresh project requires too — see the header.
  psql "$SCRATCH_URL" -q -c "DROP SCHEMA IF EXISTS public CASCADE" >/dev/null

  if ! psql "$SCRATCH_URL" -q -v ON_ERROR_STOP=1 -f "$PLAIN" >/dev/null; then
    psql "$MAINT_URL" -q -c "DROP DATABASE \"$SCRATCH\"" >/dev/null
    die "the dump did not restore cleanly; the backup was NOT written"
  fi

  psql "$SCRATCH_URL" -tAc "
    SELECT relname || '=' || n_live_tup
    FROM pg_stat_user_tables WHERE schemaname = 'public' ORDER BY relname;" |
    while read -r line; do info "  $line"; done

  psql "$MAINT_URL" -q -c "DROP DATABASE \"$SCRATCH\"" >/dev/null
  info "Restore verified, scratch database dropped"
fi

# ── Encrypt and prune ────────────────────────────────────────────────────────

DEST="$OUT_DIR/sci-cream-$STAMP.sql.gz.age"
gzip -c "$PLAIN" | age -r "$BACKUP_AGE_RECIPIENT" -o "$DEST"
chmod 600 "$DEST"
info "Wrote $DEST ($(numfmt --to=iec "$(wc -c < "$DEST")"))"

if [[ -n "$KEEP" ]]; then
  mapfile -t STALE < <(ls -1t "$OUT_DIR"/sci-cream-*.sql.gz.age 2>/dev/null | tail -n "+$((KEEP + 1))")
  if (( ${#STALE[@]} > 0 )); then
    rm -f "${STALE[@]}"
    info "Pruned ${#STALE[@]} backup(s), keeping the $KEEP most recent"
  fi
fi
