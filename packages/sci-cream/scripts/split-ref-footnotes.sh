#!/bin/bash

# The current setup is using #[doc = include_str!(...)] to include the reference entries into the
# Rust documentation comments. I haven't found a way to reference a single `<references>.md` file -
# can't seem to be able to reference individual footnotes from it - or to #[doc = include_str!(...)]
# only the required footnotes for each item instead of the whole file. For now, the hacky workaround
# that I found to work is to split the footnotes into individual files, and then include only the
# required ones in the relevant places using #[doc = include_str!("../docs/references/index/N.md")].

# This script automates the creation of those individual files from `docs/references/literature.md`
# and `docs/references/ingredients.md`, generating a file `docs/references/index/N.md` for each
# footnote `[^N]: ...` found in those files markdown, containing just that footnote line.

# @todo Look into using https://pandoc.org/ for this instead of a hacky script.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCS_DIR="$SCRIPT_DIR/../docs"
INDICES_DIR="$DOCS_DIR/references/index"
REFERENCES_FILES=("$DOCS_DIR/references/literature.md" "$DOCS_DIR/references/ingredients.md")

for REFS_FILE in "${REFERENCES_FILES[@]}"; do
    if [[ ! -f "$REFS_FILE" ]]; then
        echo "Error: references file not found at $REFS_FILE"
        exit 1
    fi

    mkdir -p "$INDICES_DIR"

    echo "Processing $REFS_FILE ->"

    while IFS= read -r line; do
        if [[ $line =~ ^\[\^([0-9]+)\]:[[:space:]]*(.+)$ ]]; then
            footnote_num="${BASH_REMATCH[1]}"
            output_file="$INDICES_DIR/${footnote_num}.md"

            echo "$line" > "$output_file"
            echo "  $output_file"
        fi
    done < "$REFS_FILE"
done
