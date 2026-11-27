#!/usr/bin/env bash
#
# copy-rustdoc.sh — Copy the crate's rustdoc output into `public/rustdoc/`, served at `/rustdoc/`.
#
# Only the crate's `pnpm doc:site` build is copied, which `build:package` runs: other builds into
# `target/doc` can hold private items or use rustdoc's default icon, so they fail here instead.
#
# Usage: ./scripts/copy-rustdoc.sh

set -euo pipefail

cd "$(dirname "$0")/.."

src=../../target/doc
dest=public/rustdoc

# `doc:site` passes `--cfg sci_cream_site_docs`, under which rustdoc writes exactly this icon link.
if ! grep -qF '<link rel="icon" href="/icon.svg">' "$src/sci_cream/index.html" 2>/dev/null; then
  echo "No site docs build in $src; run \`pnpm --dir ../sci-cream doc:site\`." >&2
  exit 1
fi

rm -rf "$dest"
cp -R "$src" "$dest"
# Rustdoc's build lock, not a page.
rm -f "$dest/.lock"
