#!/usr/bin/env bash
#
# check-migrations-unchanged.sh — Fail if an already-committed migration was edited or deleted.
#
# A migration that has run anywhere must never change. Drizzle's migrator compares bookmarks by
# timestamp rather than hash, so an edited file re-tests green while the database it already ran
# against silently keeps whatever schema the original produced.
#
# Usage: ./scripts/check-migrations-unchanged.sh [base-ref]
#
#   base-ref   Commit to compare against; defaults to origin/main. CI passes the pull request base
#              or the previous commit of a push.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# `${1-...}` rather than `${1:-...}`: CI passes an empty string when the event carries no base, and
# that must reach the check below rather than silently falling back to comparing against main.
BASE="${1-origin/main}"

# A branch's first push reports an all-zero predecessor, and a workflow_dispatch reports none.
if [[ -z "$BASE" || "$BASE" == "0000000000000000000000000000000000000000" ]]; then
  echo "No base commit for this event, so there is nothing to compare against."
  exit 0
fi

# Present locally, but CI clones shallow and has only the tip.
if ! git cat-file -e "$BASE^{commit}" 2>/dev/null; then
  git fetch --depth=1 origin "$BASE"
fi

touched=$(git diff --diff-filter=MD --name-only "$BASE" HEAD \
  -- ':(glob)drizzle/*.sql' ':(glob)drizzle/meta/*_snapshot.json')

if [[ -n "$touched" ]]; then
  echo "::error::migrations that may already be applied were modified or deleted:"
  echo "$touched"
  exit 1
fi

echo "No existing migration was modified or deleted, against $BASE."
