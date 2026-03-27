# !/bin/bash

# This script runs a subset of the CI test suite locally, using local resources without running the
# full GitHub Actions workflow via `act`. This is useful for quick feedback during development.

# Usage: ./run-local-test-suite.sh [--skip-bench]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."

cd "$ROOT_DIR" || exit 1

./packages/sci-cream/scripts/run-local-test-suite.sh "$@"
./packages/app/scripts/run-local-test-suite.sh "$@"
