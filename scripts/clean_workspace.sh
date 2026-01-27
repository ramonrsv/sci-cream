#!/bin/bash

# This script cleans up the workspace by removing generated files and directories such as
# node_modules, build artifacts, test and benchmark reports, etc. to ensure a fresh state.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

$SCRIPT_DIR/clean_reports.sh

rm -rvf $SCRIPT_DIR/../node_modules

rm -rvf $SCRIPT_DIR/../packages/app/.next
rm -rvf $SCRIPT_DIR/../packages/app/node_modules
rm -rvf $SCRIPT_DIR/../packages/app/next-env.d.ts

rm -rvf $SCRIPT_DIR/../packages/sci-cream/dist
rm -rvf $SCRIPT_DIR/../packages/sci-cream/node_modules
rm -rvf $SCRIPT_DIR/../packages/sci-cream/target
rm -rvf $SCRIPT_DIR/../packages/sci-cream/wasm
