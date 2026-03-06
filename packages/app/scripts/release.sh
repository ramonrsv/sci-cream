#!/usr/bin/env bash
#
# release.sh — Lightweight release helper for packages/app, replicating
# key cargo-release functionality.
#
# AI-generated (GitHub Copilot, Claude Sonnet/Opus 4.6).
#
# Usage:
#   ./scripts/release.sh changes                       Show commits since last app-v* tag
#   ./scripts/release.sh release patch|minor|major      Bump version & update files
#   ./scripts/release.sh release patch --execute        Actually apply changes
#   ./scripts/release.sh push                           Push commit & tag to remote
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$PKG_DIR/../.." && pwd)"
# Relative path from repo root used for git log filtering
PKG_REL="packages/app"

# ── Helpers ──────────────────────────────────────────────────────────────────

die()  { echo "error: $*" >&2; exit 1; }
info() { echo "  $*"; }

# Find the most recent app-v* tag reachable from HEAD.
# Returns empty string if none exists.
latest_tag() {
  git -C "$REPO_ROOT" describe --tags --match 'app-v*' --abbrev=0 HEAD 2>/dev/null || true
}

# Extract the semver portion from an app-vX.Y.Z tag (strips the "app-v" prefix).
version_from_tag() {
  local tag="$1"
  echo "${tag#app-v}"
}

# Read the current version from package.json.
current_version() {
  grep -oP '"version":\s*"\K[^"]+' "$PKG_DIR/package.json"
}

# Bump a semver string.  bump_version <version> <level>
bump_version() {
  local ver="$1" level="$2"
  IFS='.' read -r major minor patch <<< "$ver"
  case "$level" in
    major) major=$((major + 1)); minor=0; patch=0 ;;
    minor) minor=$((minor + 1)); patch=0 ;;
    patch) patch=$((patch + 1)) ;;
    *) die "unknown bump level: $level (expected patch|minor|major)" ;;
  esac
  echo "${major}.${minor}.${patch}"
}

# ── Subcommands ──────────────────────────────────────────────────────────────

cmd_changes() {
  local tag
  tag="$(latest_tag)"

  echo "Commits affecting $PKG_REL since ${tag:-"(beginning of history)"}:"
  echo

  local range
  if [[ -n "$tag" ]]; then
    range="${tag}..HEAD"
  else
    range="HEAD"
  fi

  git -C "$REPO_ROOT" --no-pager log --oneline "$range" -- "$PKG_REL"
}

cmd_release() {
  local level="${1:-}"
  shift || true
  [[ -z "$level" ]] && die "usage: release.sh release patch|minor|major [--execute]"

  local execute=false
  for arg in "$@"; do
    case "$arg" in
      --execute) execute=true ;;
      *) die "unknown flag: $arg" ;;
    esac
  done

  local old_ver new_ver tag_name today
  old_ver="$(current_version)"
  new_ver="$(bump_version "$old_ver" "$level")"
  tag_name="app-v${new_ver}"
  today="$(date +%Y-%m-%d)"

  echo "Release plan"
  echo "  old version : $old_ver"
  echo "  new version : $new_ver"
  echo "  tag         : $tag_name"
  echo "  date        : $today"
  echo

  # ── Define all file replacements ────────────────────────────────────────
  # Each entry: FILE  SEARCH_PATTERN  REPLACEMENT  (tab-separated)
  # We process them with sed; patterns are basic-regex with -E.

  # 1. package.json — version field
  local pj="$PKG_DIR/package.json"
  # 2. CHANGELOG.md — multiple replacements (order matters)
  local cl="$PKG_DIR/CHANGELOG.md"
  # 3. README.md — crate usage line (if present)
  local rm="$PKG_DIR/README.md"

  # Build a description of planned changes for the dry-run report.
  echo "Planned file changes:"
  echo

  # -- package.json --------------------------------------------------------
  info "$PKG_REL/package.json"
  info "  \"version\": \"$old_ver\"  →  \"version\": \"$new_ver\""
  echo

  # -- README.md -----------------------------------------------------------
  if grep -qE 'sci-cream = ' "$rm" 2>/dev/null; then
    info "$PKG_REL/README.md"
    info "  sci-cream = ...  →  sci-cream = \"$new_ver\""
    echo
  fi

  # -- CHANGELOG.md --------------------------------------------------------
  info "$PKG_REL/CHANGELOG.md"
  info "  [Unreleased]  →  [$new_ver]"
  info "  ...HEAD       →  ...$tag_name"
  info "  ReleaseDate   →  $today"
  info "  Re-add [Unreleased] header after <!-- next-header -->"
  info "  Re-add [Unreleased] link   after <!-- next-url -->"
  echo

  if [[ "$execute" != true ]]; then
    echo "(dry run — pass --execute to apply)"
    return 0
  fi

  echo "Applying changes..."

  # -- package.json --------------------------------------------------------
  sed -i -E "s/\"version\": \"[^\"]+\"/\"version\": \"$new_ver\"/" "$pj"
  info "Updated $PKG_REL/package.json"

  # -- README.md -----------------------------------------------------------
  if grep -qE 'sci-cream = ' "$rm" 2>/dev/null; then
    sed -i -E "s/sci-cream = .*/sci-cream = \"$new_ver\"/" "$rm"
    info "Updated $PKG_REL/README.md"
  fi

  # -- CHANGELOG.md --------------------------------------------------------
  # Replace "Unreleased" with the new version (both header and link label).
  sed -i "s/Unreleased/$new_ver/g" "$cl"
  # Replace "...HEAD" with "...<tag_name>" (only the first occurrence).
  sed -i "0,/\\.\\.\\.HEAD/s/\\.\\.\\.HEAD/...${tag_name}/" "$cl"
  # Replace "ReleaseDate" with today's date.
  sed -i "s/ReleaseDate/$today/g" "$cl"
  # Re-insert the Unreleased header after <!-- next-header -->.
  sed -i "s/<!-- next-header -->/<!-- next-header -->\n\n## [Unreleased] - ReleaseDate/" "$cl"
  # Re-insert the Unreleased compare link before the newly-versioned link.
  sed -i "s|^\[$new_ver\]:|[Unreleased]: https://github.com/ramonrsv/sci-cream/compare/${tag_name}...HEAD\n[$new_ver]:|" "$cl"
  info "Updated $PKG_REL/CHANGELOG.md"

  # -- git add, commit, tag ------------------------------------------------
  echo
  info "Staging $PKG_REL/ ..."
  git -C "$REPO_ROOT" add -- "$PKG_REL"

  info "Committing..."
  git -C "$REPO_ROOT" commit -m "chore(app): release $new_ver"

  info "Tagging $tag_name ..."
  git -C "$REPO_ROOT" tag -a "$tag_name" -m "chore(app): release $new_ver"

  echo
  echo "Done. Run '$(basename "$0") push' when ready to push."
}

cmd_push() {
  local tag
  tag="$(latest_tag)"
  [[ -z "$tag" ]] && die "no app-v* tag found — run 'release' first"

  echo "Pushing current branch and tag $tag ..."
  git -C "$REPO_ROOT" push
  git -C "$REPO_ROOT" push origin "$tag"
  echo "Done."
}

# ── Main ─────────────────────────────────────────────────────────────────────

case "${1:-}" in
  changes)
    shift
    cmd_changes "$@"
    ;;
  release)
    shift
    cmd_release "$@"
    ;;
  push)
    shift
    cmd_push "$@"
    ;;
  *)
    echo "Usage:"
    echo "  $(basename "$0") changes                        Show commits since last app-v* tag"
    echo "  $(basename "$0") release patch|minor|major      Plan version bump (dry run)"
    echo "  $(basename "$0") release patch --execute        Apply version bump"
    echo "  $(basename "$0") push                           Push commit & tag to remote"
    exit 1
    ;;
esac
