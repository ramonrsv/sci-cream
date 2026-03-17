import {
  Bridge as WasmBridge,
  new_ingredient_database_seeded_from_embedded_data,
} from "@workspace/sci-cream";

import { USER_DEFINED_FRUCTOSE_SPEC } from "@/lib/database/util";

export const WASM_BRIDGE = new WasmBridge(new_ingredient_database_seeded_from_embedded_data());
WASM_BRIDGE.seed_from_specs([USER_DEFINED_FRUCTOSE_SPEC]);
