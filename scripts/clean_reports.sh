#!/bin/bash

# This script cleans up test, coverage, and benchmark reports generated during development

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

rm -rvf $SCRIPT_DIR/../packages/app/bench-results
rm -rvf $SCRIPT_DIR/../packages/app/coverage
rm -rvf $SCRIPT_DIR/../packages/app/playwright-report
rm -rvf $SCRIPT_DIR/../packages/app/test-results

rm -rvf $SCRIPT_DIR/../packages/sci-cream/coverage
rm -rvf $SCRIPT_DIR/../packages/sci-cream/target/criterion
rm -rvf $SCRIPT_DIR/../packages/sci-cream/target/llvm-cov*
