import {
  CompKey,
  RatioKey,
  FpdKey,
  comp_key_as_short_str,
  comp_key_as_med_str,
  comp_key_as_long_str,
  ratio_key_as_long_str,
  ratio_key_as_med_str,
  ratio_key_as_short_str,
  fpd_key_as_long_str,
  fpd_key_as_med_str,
  fpd_key_as_short_str,
  Composition,
  MixProperties,
} from "../../wasm/index";

import {
  PropKey,
  getPropKeys,
  getMixProperty,
  prop_key_as_short_str,
  prop_key_as_med_str,
  prop_key_as_long_str,
} from "./prop-key";

import { getWasmEnums } from "./util";

/// Optimization functions to move key lookups from JS <-> WASM boundary to JS side, as that can
/// be orders of magnitude more performant for simple key accesses without complex computations.

/** Builds a map from each key to its corresponding numeric value using the provided function. */
function makeValueMap<K>(keys: K[], keyToValueFn: (key: K) => number): ReadonlyMap<K, number> {
  return new Map<K, number>(keys.map((key) => [key, keyToValueFn(key)]));
}

/** Builds a map of all `CompKey`s to their corresponding values from the given composition. */
export function makeCompValueMap(composition: Composition): ReadonlyMap<CompKey, number> {
  return makeValueMap(getWasmEnums(CompKey), (key) => composition.get(key));
}

/** Builds a map of all `PropKey`s to their corresponding values from the given mix properties. */
export function makeMixPropValueMap(mixProperties: MixProperties): ReadonlyMap<PropKey, number> {
  return makeValueMap(getPropKeys(), (key) => getMixProperty(mixProperties, key));
}

/** Builds a map from each key to its corresponding string rep. using the provided function. */
function makeKeyStrMap<K>(keys: K[], keyToStrFn: (key: K) => string): ReadonlyMap<K, string> {
  return new Map<K, string>(keys.map((key) => [key, keyToStrFn(key)]));
}

const COMP_KEY_AS_SHORT_STR_MAP = makeKeyStrMap(getWasmEnums(CompKey), comp_key_as_short_str);
const COMP_KEY_AS_MED_STR_MAP = makeKeyStrMap(getWasmEnums(CompKey), comp_key_as_med_str);
const COMP_KEY_AS_LONG_STR_MAP = makeKeyStrMap(getWasmEnums(CompKey), comp_key_as_long_str);

const RATIO_KEY_AS_SHORT_STR_MAP = makeKeyStrMap(getWasmEnums(RatioKey), ratio_key_as_short_str);
const RATIO_KEY_AS_MED_STR_MAP = makeKeyStrMap(getWasmEnums(RatioKey), ratio_key_as_med_str);
const RATIO_KEY_AS_LONG_STR_MAP = makeKeyStrMap(getWasmEnums(RatioKey), ratio_key_as_long_str);

const FPD_KEY_AS_SHORT_STR_MAP = makeKeyStrMap(getWasmEnums(FpdKey), fpd_key_as_short_str);
const FPD_KEY_AS_MED_STR_MAP = makeKeyStrMap(getWasmEnums(FpdKey), fpd_key_as_med_str);
const FPD_KEY_AS_LONG_STR_MAP = makeKeyStrMap(getWasmEnums(FpdKey), fpd_key_as_long_str);

const PROP_KEY_AS_SHORT_STR_MAP = makeKeyStrMap(getPropKeys(), prop_key_as_short_str);
const PROP_KEY_AS_MED_STR_MAP = makeKeyStrMap(getPropKeys(), prop_key_as_med_str);
const PROP_KEY_AS_LONG_STR_MAP = makeKeyStrMap(getPropKeys(), prop_key_as_long_str);

/** Returns the short display string for the given `CompKey`, looked up from a pre-built map */
export function compKeyAsShortStr(comp_key: CompKey): string {
  return COMP_KEY_AS_SHORT_STR_MAP.get(comp_key)!;
}

/** Returns the med-length display string for the given `CompKey`, looked up from a pre-built map */
export function compKeyAsMedStr(comp_key: CompKey): string {
  return COMP_KEY_AS_MED_STR_MAP.get(comp_key)!;
}

/** Returns the long display string for the given `CompKey`, looked up from a pre-built map */
export function compKeyAsLongStr(comp_key: CompKey): string {
  return COMP_KEY_AS_LONG_STR_MAP.get(comp_key)!;
}

/** Returns the short display string for the given `RatioKey`, looked up from a pre-built map */
export function ratioKeyAsShortStr(ratio_key: RatioKey): string {
  return RATIO_KEY_AS_SHORT_STR_MAP.get(ratio_key)!;
}

/** Returns the med-length display string for the given `RatioKey`, looked up from a pre-built map */
export function ratioKeyAsMedStr(ratio_key: RatioKey): string {
  return RATIO_KEY_AS_MED_STR_MAP.get(ratio_key)!;
}

/** Returns the long display string for the given `RatioKey`, looked up from a pre-built map */
export function ratioKeyAsLongStr(ratio_key: RatioKey): string {
  return RATIO_KEY_AS_LONG_STR_MAP.get(ratio_key)!;
}

/** Returns the short display string for the given `FpdKey`, looked up from a pre-built map */
export function fpdKeyAsShortStr(fpd_key: FpdKey): string {
  return FPD_KEY_AS_SHORT_STR_MAP.get(fpd_key)!;
}

/** Returns the med-length display string for the given `FpdKey`, looked up from a pre-built map */
export function fpdKeyAsMedStr(fpd_key: FpdKey): string {
  return FPD_KEY_AS_MED_STR_MAP.get(fpd_key)!;
}

/** Returns the long display string for the given `FpdKey`, looked up from a pre-built map */
export function fpdKeyAsLongStr(fpd_key: FpdKey): string {
  return FPD_KEY_AS_LONG_STR_MAP.get(fpd_key)!;
}

/** Returns the short display string for the given `PropKey`, looked up from a pre-built map */
export function propKeyAsShortStr(prop_key: PropKey): string {
  return PROP_KEY_AS_SHORT_STR_MAP.get(prop_key)!;
}

/** Returns the med-length display string for the given `PropKey`, looked up from a pre-built map */
export function propKeyAsMedStr(prop_key: PropKey): string {
  return PROP_KEY_AS_MED_STR_MAP.get(prop_key)!;
}

/** Returns the long display string for the given `PropKey`, looked up from a pre-built map */
export function propKeyAsLongStr(prop_key: PropKey): string {
  return PROP_KEY_AS_LONG_STR_MAP.get(prop_key)!;
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
