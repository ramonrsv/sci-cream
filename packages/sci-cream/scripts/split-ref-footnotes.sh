#!/usr/bin/env bash
#
# split-ref-footnotes.sh — One file per bibliography footnote, for `#[doc = include_str!(...)]`.
#
# The current setup is using #[doc = include_str!(...)] to include the reference entries into the
# Rust documentation comments. I haven't found a way to reference a single `<references>.md` file -
# can't seem to be able to reference individual footnotes from it - or to #[doc = include_str!(...)]
# only the required footnotes for each item instead of the whole file. For now, the hacky workaround
# that I found to work is to split the footnotes into individual files, and then include only the
# required ones in the relevant places using #[doc = include_str!("../docs/references/index/N.md")].
#
# This script automates the creation of those individual files from `docs/references/literature.md`
# and `docs/references/ingredients.md`, generating a file `docs/references/index/N.md` for each
# footnote `[^N]: ...` found in those files markdown, containing just that footnote line.
#
# @todo Look into using https://pandoc.org/ for this instead of a hacky script.
#
# Usage: ./scripts/split-ref-footnotes.sh [--check]
#
#   --check   Write nothing; report whether every tracked index file matches its definition, and
#             exit non-zero if any is missing, stale, or left behind by a deleted footnote.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REFERENCES_DIR="$PKG_ROOT/docs/references"
INDICES_DIR="$REFERENCES_DIR/index"
REFERENCES_FILES=("$REFERENCES_DIR/literature.md" "$REFERENCES_DIR/ingredients.md")

case "${1-}" in
  "") check=false ;;
  --check) check=true ;;
  *)
    echo "Unknown argument: $1" >&2
    echo "Usage: $(basename "$0") [--check]" >&2
    exit 2
    ;;
esac

# Footnote numbers the bibliographies define, so `--check` can spot an index file left behind by a
# definition that has since been deleted; the writing path never removes anything.
declare -A defined=()
stale=()

$check || mkdir -p "$INDICES_DIR"

for refs_file in "${REFERENCES_FILES[@]}"; do
  if [[ ! -f "$refs_file" ]]; then
    echo "Error: references file not found at $refs_file" >&2
    exit 1
  fi

  $check || echo "Processing ${refs_file#"$PKG_ROOT/"} ->"

  while IFS= read -r line; do
    [[ $line =~ ^\[\^([0-9]+)\]:[[:space:]]*(.+)$ ]] || continue

    footnote_num="${BASH_REMATCH[1]}"
    output_file="$INDICES_DIR/${footnote_num}.md"
    defined["$footnote_num"]=1

    if $check; then
      if [[ ! -f "$output_file" || "$(cat "$output_file")" != "$line" ]]; then
        stale+=("${output_file#"$PKG_ROOT/"}")
      fi
    else
      echo "$line" >"$output_file"
      echo "  ${output_file#"$PKG_ROOT/"}"
    fi
  done <"$refs_file"
done

$check || exit 0

# Without `nullglob` a missing or empty index directory yields the literal pattern, which would
# then be reported as an orphan on top of the missing files already listed above.
shopt -s nullglob
orphans=()
for file in "$INDICES_DIR"/*.md; do
  footnote_num="$(basename "$file" .md)"
  [[ -v defined["$footnote_num"] ]] || orphans+=("${file#"$PKG_ROOT/"}")
done

if ((${#stale[@]} > 0)); then
  echo "Reference index is stale. Run \`pnpm gen:footnotes\`. Affected:" >&2
  printf '  %s\n' "${stale[@]}" >&2
fi

# Listed apart because the writing path does not delete: rerunning the script will not clear these.
if ((${#orphans[@]} > 0)); then
  echo "Reference index files with no matching definition; delete them:" >&2
  printf '  %s\n' "${orphans[@]}" >&2
fi

if ((${#stale[@]} > 0 || ${#orphans[@]} > 0)); then
  exit 1
fi

echo "split-ref-footnotes --check: ${#defined[@]} index files up to date."
