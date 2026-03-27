# !/bin/bash

# This script runs a subset of the CI test suite locally, using local resources without running the
# full GitHub Actions workflow via `act`. This is useful for quick feedback during development.

# Usage: ./run-local-test-suite.sh [--skip-bench]

SKIP_BENCH=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --skip-bench)
            SKIP_BENCH=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: ./run-local-test-suite.sh [--skip-bench]"
            exit 1
            ;;
    esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRATE_DIR="$SCRIPT_DIR/.."

cd "$CRATE_DIR" || exit 1

function execute() {
    echo "Executing: $*"
    "$@"
    if [[ $? -ne 0 ]]; then
        echo "Error: Command failed: $*"
        exit 1
    fi
}

execute pnpm build:package
execute pnpm test
execute pnpm lint
execute pnpm fmt:check
execute pnpm doc
execute pnpm coverage

if [[ "$SKIP_BENCH" == false ]]; then
    execute pnpm bench
fi
