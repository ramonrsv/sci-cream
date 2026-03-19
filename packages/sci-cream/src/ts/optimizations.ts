import { CompKey, comp_key_as_med_str, Composition, MixProperties } from "../../wasm/index";

import { PropKey, getPropKeys, getMixProperty, prop_key_as_med_str } from "./prop-key";

import { getWasmEnums } from "./util";

/// Optimization functions to move key lookups from JS <-> WASM boundary to JS side, as that can
/// be orders of magnitude more performant for simple key accesses without complex computations.

/** Builds a map from each key to its corresponding numeric value using the provided function. */
function makeValueMap<K>(keys: K[], keyToValueFn: (key: K) => number): Map<K, number> {
  return new Map<K, number>(keys.map((key) => [key, keyToValueFn(key)]));
}

/** Builds a map of all `CompKey`s to their corresponding values from the given composition. */
export function makeCompValueMap(composition: Composition): Map<CompKey, number> {
  return makeValueMap(getWasmEnums(CompKey), (key) => composition.get(key));
}

/** Builds a map of all `PropKey`s to their corresponding values from the given mix properties. */
export function makeMixPropValueMap(mixProperties: MixProperties): Map<PropKey, number> {
  return makeValueMap(getPropKeys(), (key) => getMixProperty(mixProperties, key));
}

/** Builds a map from each key to its corresponding string rep. using the provided function. */
function makeKeyStrMap<K>(keys: K[], keyToStrFn: (key: K) => string): Map<K, string> {
  return new Map<K, string>(keys.map((key) => [key, keyToStrFn(key)]));
}

const COMP_KEY_AS_MED_STR_MAP = makeKeyStrMap(getWasmEnums(CompKey), comp_key_as_med_str);
const PROP_KEY_AS_MED_STR_MAP = makeKeyStrMap(getPropKeys(), prop_key_as_med_str);

/** Returns the med-length display string for the given `CompKey`, looked up from a pre-built map */
export function compKeyAsMedStr(comp_key: CompKey): string {
  return COMP_KEY_AS_MED_STR_MAP.get(comp_key)!;
}

/** Returns the med-length display string for the given `PropKey`, looked up from a pre-built map */
export function propKeyAsMedStr(prop_key: PropKey): string {
  return PROP_KEY_AS_MED_STR_MAP.get(prop_key)!;
}

/**
 * Computes a composition value as an absolute quantity based on the ingredient or mix quantity.
 *
 * @see composition_value_as_quantity in Rust for the original implementation of this function.
 */
export function compositionValueAsQuantity(comp: number, qty: number): number {
  return (comp * qty) / 100.0;
}

/**
 * Computes an ingredient composition value and quantity as a percentage of the total mix.
 *
 * @see composition_value_as_percentage in Rust for the original implementation of this function.
 */
export function compositionValueAsPercentage(comp: number, qty: number, mix_total: number): number {
  return (comp * qty) / mix_total;
}
