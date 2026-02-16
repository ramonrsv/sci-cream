import {
  Bridge as WasmBridge,
  new_ingredient_database_seeded_from_embedded_data,
} from "@workspace/sci-cream";

export const WASM_BRIDGE = new WasmBridge(new_ingredient_database_seeded_from_embedded_data());
