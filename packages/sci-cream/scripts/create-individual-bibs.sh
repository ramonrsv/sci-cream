#!/bin/bash

# The current setup is using #[doc = include_str!(...)] to include the bibliography entries into the
# Rust documentation comments. I haven't found a way to reference a single `bibliography.md` file -
# can't seem to be able to reference individual footnotes from it - or to #[doc = include_str!(...)]
# only the required footnotes for each item instead of the whole file. For now, the hacky workaround
# that found to work is to split the footnotes into individual files, and then include only the
# required ones in the relevant places using #[doc = include_str!("../docs/bibs/N.md")].

# This script automates the creation of those individual files from `bibliography.md`, generating
# a file `docs/bibs/N.md` for each footnote `[^N]: ...` found, containing just that footnote line.

# @todo Look into using https://pandoc.org/ for this instead of a hacky script.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCS_DIR="$SCRIPT_DIR/../docs"
BIBS_DIR="$DOCS_DIR/bibs"
BIBLIOGRAPHY_FILE="$DOCS_DIR/bibliography.md"

if [[ ! -f "$BIBLIOGRAPHY_FILE" ]]; then
    echo "Error: bibliography.md not found at $BIBLIOGRAPHY_FILE"
    exit 1
fi

mkdir -p "$BIBS_DIR"

echo "Processing $BIBLIOGRAPHY_FILE ->"

while IFS= read -r line; do
    if [[ $line =~ ^\[\^([0-9]+)\]:[[:space:]]*(.+)$ ]]; then
        footnote_num="${BASH_REMATCH[1]}"
        output_file="$BIBS_DIR/${footnote_num}.md"

        echo "$line" > "$output_file"
        echo "  $output_file"
    fi
done < "$BIBLIOGRAPHY_FILE"
