# shellcheck shell=bash
#
# env.sh — Filling in a script's variables from the file that already holds them.
#
# Sourced, not executed. A value still missing afterwards is reported by the caller's own `:?` or
# `require_*` check, which says what to set and why.
#
# Every caller names the one file it wants — deliberately, with no helper that loads whichever env
# files exist. `prod.env` holds production URLs, while the local test suite drops and reseeds the
# database `POSTGRES_URL` names, so crossing the two would point a destructive run at production.
#

# load_env_file <path> [name...]
#
# Exports the assignments in <path> that the environment does not already carry, so `VAR=... ./x`
# still overrides and CI's injected secrets stand on a runner with no such file. Named, only those
# variables are taken; unnamed, every assignment is. A missing file is not an error.
#
# The file is parsed, not sourced: `set -a; . file` would overwrite what the environment already
# holds, losing that precedence, and would run whatever else the file happened to contain.
load_env_file() {
  local file="$1"
  shift
  local wanted=" $* "   # space-delimited, so "  " on its own means every assignment

  [[ -f "$file" ]] || return 0

  local line name value
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"            # leading whitespace
    [[ -n "$line" && "$line" != '#'* ]] || continue
    line="${line#export }"

    name="${line%%=*}"
    [[ "$line" == *=* && "$name" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    [[ "$wanted" == "  " || "$wanted" == *" $name "* ]] || continue

    # Already set wins. Empty counts as unset, matching the `:?` checks that read these back.
    [[ -z "${!name:-}" ]] || continue

    value="${line#*=}"
    value="${value%"${value##*[![:space:]]}"}"         # trailing whitespace
    case "$value" in
      '"'*'"' | "'"*"'")
        value="${value:1:${#value} - 2}" ;;
      *)
        value="${value%%[[:space:]]#*}"                # unquoted: a trailing comment is not a value
        value="${value%"${value##*[![:space:]]}"}" ;;
    esac

    export "${name}=${value}"
  done < "$file"
}

# load_prod_env
#
# The production URLs and the age recipient live outside the repository, in a file the app never
# loads — DEVELOPMENT.md says why one must never reach `.env`. `SCI_CREAM_PROD_ENV` names another.
load_prod_env() {
  load_env_file "${SCI_CREAM_PROD_ENV:-${XDG_CONFIG_HOME:-$HOME/.config}/sci-cream/prod.env}"
}
