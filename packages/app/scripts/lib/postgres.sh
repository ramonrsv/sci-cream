# shellcheck shell=bash
#
# postgres.sh — Preconditions shared by the scripts that read the production database.
#
# Sourced, not executed, from a caller running under `set -euo pipefail`.
#
# Failure goes through `die`, which exits the caller — so nothing here may be used in a `$(...)`
# substitution, where the subshell would swallow the exit. Results come back in named globals.
#

die() {
  echo "error: $*" >&2
  exit 1
}

info() { echo "  $*"; }

# require_production_url <var-name>
#
# Named, not passed by value, so the error says what to fix. A local URL would act on the seeded
# development database: a backup that looks successful, a rehearsal that proves nothing.
require_production_url() {
  local name="$1" url="${!1-}"

  [[ -n "$url" ]] || die "set $name to the Supabase session pooler URL"

  case "$url" in
    *localhost* | *127.0.0.1*)
      die "$name points at localhost, but this script acts on production" ;;
    *:6543/*)
      die "port 6543 in $name is Supabase's transaction pooler, which cannot serve pg_dump;" \
          "use the session pooler on 5432" ;;
  esac
}

# prepare_pg_dump <var-name>
#
# Sets SERVER_MAJOR, PG_DUMP, and CLIENT_MAJOR.
#
# `pg_dump` on the PATH is pg_wrapper, which picks the local default cluster's version when given
# no host, so its `--version` need not match the binary a remote dump runs. Name one instead,
# preferring the server's major: a newer pg_dump emits `SET`s an older restore target rejects.
prepare_pg_dump() {
  local url="${!1}" version

  version="$(psql "$url" -tAc 'SHOW server_version_num')" || die "cannot reach the server named by $1"
  SERVER_MAJOR=$((version / 10000))

  PG_DUMP="/usr/lib/postgresql/$SERVER_MAJOR/bin/pg_dump"
  [[ -x "$PG_DUMP" ]] || PG_DUMP="$(printf '%s\n' /usr/lib/postgresql/*/bin/pg_dump | sort -V | tail -1)"
  [[ -x "$PG_DUMP" ]] || PG_DUMP="$(command -v pg_dump || true)"   # not a Debian-packaged install
  [[ -x "$PG_DUMP" ]] || die "pg_dump not found; install postgresql-client-$SERVER_MAJOR"

  # pg_dump cannot read a server newer than itself, and says so cryptically.
  CLIENT_MAJOR="$("$PG_DUMP" --version | sed -E 's/.* ([0-9]+).*/\1/')"
  if ((SERVER_MAJOR > CLIENT_MAJOR)); then
    die "the server is PostgreSQL $SERVER_MAJOR but pg_dump is $CLIENT_MAJOR;" \
        "install postgresql-client-$SERVER_MAJOR from the PGDG apt repository"
  fi
}

# require_restore_target <url> <var-name>
#
# Postgres will not restore into an older major: pg_dump 17 opens with a `SET transaction_timeout`,
# which 16 rejects. Checked before the dump, so a mismatch costs nothing.
require_restore_target() {
  local version
  version="$(psql "$1" -tAc 'SHOW server_version_num')" || die "cannot reach the server named by $2"

  if ((SERVER_MAJOR > version / 10000)); then
    die "the server is PostgreSQL $SERVER_MAJOR but $2 is $((version / 10000));" \
        "point it at a PostgreSQL $SERVER_MAJOR server"
  fi
}
