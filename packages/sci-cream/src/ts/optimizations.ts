import { CompKey, comp_key_as_med_str } from "../../wasm/index";

import { PropKey, getPropKeys, prop_key_as_med_str } from "./prop-key";

import { getWasmEnums } from "./util";

/// Optimization functions to move key lookups from JS <-> WASM boundary to JS side, as that can
/// be orders of magnitude more performant for simple key accesses without complex computations.

function makeKeyStrMap<K>(keys: K[], keyToStrFn: (key: K) => string): Map<K, string> {
  return new Map<K, string>(keys.map((key) => [key, keyToStrFn(key)]));
}

const COMP_KEY_AS_MED_STR_MAP = makeKeyStrMap(getWasmEnums(CompKey), comp_key_as_med_str);
const PROP_KEY_AS_MED_STR_MAP = makeKeyStrMap(getPropKeys(), prop_key_as_med_str);

export function compKeyAsMedStr(comp_key: CompKey): string {
  return COMP_KEY_AS_MED_STR_MAP.get(comp_key)!;
}

export function propKeyAsMedStr(prop_key: PropKey): string {
  return PROP_KEY_AS_MED_STR_MAP.get(prop_key)!;
}
