import {
  Bridge as WasmBridge,
  new_ingredient_database_seeded_from_embedded_data,
} from "@workspace/sci-cream";

import { USER_DEFINED_FRUCTOSE_SPEC } from "@/lib/database/util";

/**
 * Single shared WASM bridge instance used for testing
 *
 * Note: This is seeded with the same embedded data as the main app, so tests can rely on that data
 * being present. Additionally, it is seeded with {@link USER_DEFINED_FRUCTOSE_SPEC}, a user-defined
 * spec, to allow testing of custom specs without needing to insert them into the database first.
 */
export const WASM_BRIDGE = new WasmBridge(new_ingredient_database_seeded_from_embedded_data());
WASM_BRIDGE.seed_from_specs([USER_DEFINED_FRUCTOSE_SPEC]);
