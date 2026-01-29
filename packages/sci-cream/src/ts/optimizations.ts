import { CompKey, comp_key_as_med_str, Composition, MixProperties } from "../../wasm/index";

import { PropKey, getPropKeys, getMixProperty, prop_key_as_med_str } from "./prop-key";

import { getWasmEnums } from "./util";

/// Optimization functions to move key lookups from JS <-> WASM boundary to JS side, as that can
/// be orders of magnitude more performant for simple key accesses without complex computations.

function makeValueMap<K>(keys: K[], keyToValueFn: (key: K) => number): Map<K, number> {
  return new Map<K, number>(keys.map((key) => [key, keyToValueFn(key)]));
}

export function makeCompValueMap(composition: Composition): Map<CompKey, number> {
  return makeValueMap(getWasmEnums(CompKey), (key) => composition.get(key));
}

export function makeMixPropValueMap(mixProperties: MixProperties): Map<PropKey, number> {
  return makeValueMap(getPropKeys(), (key) => getMixProperty(mixProperties, key));
}

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
