# !/bin/bash

# This script sets the crate type for the sci-cream package to the value passed in $2.
# It is used to switch between "cdylib" (for WebAssembly builds) and "rlib" (for native builds),
# since tools like wasm-pack do not currently support setting the crate type via command line flags.

# @todo This and its uses are super hacky, but it's a workaround for lack of support in wasm-pack.
# If and when wasm-pack supports a `--crate-type` flag, this script and its uses can be removed.

# Usage: ./set_crate_type.sh <cargo-toml-path> <crate-type>

CARGO_TOML_PATH=$1
CRATE_TYPE=$2

sed -i -E "s/^crate-type = \[.*\]/crate-type = [\"$CRATE_TYPE\"]/g" "$CARGO_TOML_PATH"
