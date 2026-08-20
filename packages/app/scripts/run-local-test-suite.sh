# !/bin/bash

# This script runs a subset of the CI test suite locally, using local resources without running the
# full GitHub Actions workflow via `act`. This is useful for quick feedback during development.

# Usage: ./run-local-test-suite.sh [--skip-bench] [--chromium-only]
#
# POSTGRES_URL is read from packages/app/.env when it is not already exported; exporting one wins.
# Only that name, and only from that file — everything below drops and reseeds local databases.

SKIP_BENCH=false
CHROMIUM_ONLY=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --skip-bench)
            SKIP_BENCH=true
            shift
            ;;
        --chromium-only)
            CHROMIUM_ONLY=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: ./run-local-test-suite.sh [--skip-bench] [--chromium-only]"
            exit 1
            ;;
    esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR/.."

cd "$APP_DIR" || exit 1

# shellcheck source=lib/env.sh
source "$SCRIPT_DIR/lib/env.sh"

# The app's own commands read .env through dotenv; the migration-test lines below need POSTGRES_URL
# in the shell itself. `.env.local` is consulted first, the order Next.js resolves the two in.
load_env_file "$APP_DIR/.env.local" POSTGRES_URL
load_env_file "$APP_DIR/.env" POSTGRES_URL

function execute() {
    echo "Executing: $*"
    "$@"
    if [[ $? -ne 0 ]]; then
        echo "Error: Command failed: $*"
        exit 1
    fi
}

execute pnpm build:deps
execute pnpm prettier
execute pnpm lint
execute pnpm lint:sql
execute ./scripts/check-migrations-unchanged.sh

execute pnpm build
execute pnpm seed-db
execute pnpm test:unit

# Mirrors the `db_migration` CI job: applies the newest migration to a database one behind, holding
# rows, then tests the data layer against it. Uses its own database, not the development one.
: "${POSTGRES_URL:?not set, and not in packages/app/.env; the migration test DB derives from it}"
MIGRATION_URL="${POSTGRES_URL%/*}/sci_cream_migration_test"
execute env POSTGRES_URL="$MIGRATION_URL" ./scripts/build-migration-test-db.sh
execute env POSTGRES_URL="$MIGRATION_URL" npx drizzle-kit migrate
execute env POSTGRES_URL="$MIGRATION_URL" pnpm test:unit src/lib/data/

if [[ "$CHROMIUM_ONLY" == true ]]; then
    execute env CI=true pnpm test:e2e:chromium
else
    execute env CI=true pnpm test:e2e
fi

execute pnpm test:visual
execute pnpm doc
execute pnpm coverage

if [[ "$SKIP_BENCH" == false ]]; then
    execute pnpm bench
fi
