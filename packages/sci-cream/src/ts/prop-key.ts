import {
  CompKey,
  FpdKey,
  RatioKey,
  comp_key_as_short_str,
  comp_key_as_med_str,
  comp_key_as_long_str,
  ratio_key_as_short_str,
  ratio_key_as_med_str,
  ratio_key_as_long_str,
  fpd_key_as_short_str,
  fpd_key_as_med_str,
  fpd_key_as_long_str,
  MixProperties,
} from "../../wasm/index";

import { getTsEnumStringKeys } from "./util";

/** Union of all `CompKey`, `RatioKey`, and `FpdKey` enum members, used as a unified property key*/
export const PropKeyObj = { ...CompKey, ...RatioKey, ...FpdKey } as const;

export type PropKey = keyof typeof PropKeyObj;

/** Converts a `CompKey` enum value to its equivalent `PropKey`. */
export function compToPropKey(comp_key: CompKey): PropKey {
  return CompKey[comp_key] as PropKey;
}

/** Converts a `RatioKey` enum value to its equivalent `PropKey`. */
export function ratioToPropKey(ratio_key: RatioKey): PropKey {
  return RatioKey[ratio_key] as PropKey;
}

/** Converts an `FpdKey` enum value to its equivalent `PropKey`. */
export function fpdToPropKey(fpd_key: FpdKey): PropKey {
  return FpdKey[fpd_key] as PropKey;
}

/** Returns true if the given `PropKey` corresponds to a `CompKey`. */
export function isCompKey(prop_key: PropKey): boolean {
  return getTsEnumStringKeys(CompKey).includes(prop_key as keyof typeof CompKey);
}

/** Returns true if the given `PropKey` corresponds to a `RatioKey`. */
export function isRatioKey(prop_key: PropKey): boolean {
  return getTsEnumStringKeys(RatioKey).includes(prop_key as keyof typeof RatioKey);
}

/** Returns true if the given `PropKey` corresponds to an `FpdKey`. */
export function isFpdKey(prop_key: PropKey): boolean {
  return getTsEnumStringKeys(FpdKey).includes(prop_key as keyof typeof FpdKey);
}

/** Converts a `PropKey` to its equivalent `CompKey` value, throwing if it's not a `CompKey`. */
export function propToCompKey(prop_key: PropKey): CompKey {
  if (isCompKey(prop_key)) return CompKey[prop_key as keyof typeof CompKey];
  throw new Error("PropKey is not a CompKey: " + prop_key);
}

/** Converts a `PropKey` to its equivalent `RatioKey` value, throwing if it's not a `RatioKey`. */
export function propToRatioKey(prop_key: PropKey): RatioKey {
  if (isRatioKey(prop_key)) return RatioKey[prop_key as keyof typeof RatioKey];
  throw new Error("PropKey is not a RatioKey: " + prop_key);
}

/** Converts a `PropKey` to its equivalent `FpdKey` value, throwing if it's not an `FpdKey`. */
export function propToFpdKey(prop_key: PropKey): FpdKey {
  if (isFpdKey(prop_key)) return FpdKey[prop_key as keyof typeof FpdKey];
  throw new Error("PropKey is not an FpdKey: " + prop_key);
}

/**
 * Returns all `PropKey`s in the correct order: `CompKey`, then `RatioKey`, then `FpdKey` values.
 *
 * It's necessary to use this function instead of `Object.keys(PropKeyObj)` in order to maintain
 * the correct order of the keys as given by the `getTsEnumStringKeys` of each enum.
 *
 * **Note**: This function uses `getTsEnumStringKeys` on each enum separately rather than
 * `Object.keys(PropKeyObj)` to preserve the correct ordering. `getTsEnumStringKeys(PropKeyObj)`
 * does not work correctly since it uses `Object.values()` internally. `Object.keys(PropKeyObj)`
 * does produce the correct unique keys but does not guarantee the correct order, which is important
 * for any logic that relies on the order of the keys (e.g. consistent display order in UI).
 */
export function getPropKeys(): PropKey[] {
  return [
    ...getTsEnumStringKeys(CompKey),
    ...getTsEnumStringKeys(RatioKey),
    ...getTsEnumStringKeys(FpdKey),
  ] as PropKey[];
}

/** Dispatches a `PropKey` to the matching typed callback, throwing if the key is unrecognized. */
function dispatchPropKey<T>(
  prop_key: PropKey,
  onComp: (k: CompKey) => T,
  onRatio: (k: RatioKey) => T,
  onFpd: (k: FpdKey) => T,
): T {
  if (isCompKey(prop_key)) return onComp(CompKey[prop_key as keyof typeof CompKey]);
  if (isRatioKey(prop_key)) return onRatio(RatioKey[prop_key as keyof typeof RatioKey]);
  if (isFpdKey(prop_key)) return onFpd(FpdKey[prop_key as keyof typeof FpdKey]);
  throw new Error("Invalid PropKey: " + prop_key);
}

/**
 * Returns the compact display string for the given `PropKey`.
 *
 * @see comp_key_as_short_str original implementation for `CompKey` values in Rust.
 * @see ratio_key_as_short_str original implementation for `RatioKey` values in Rust.
 * @see fpd_key_as_short_str original implementation for `FpdKey` values in Rust.
 */
export function prop_key_as_short_str(prop_key: PropKey): string {
  return dispatchPropKey(
    prop_key,
    comp_key_as_short_str,
    ratio_key_as_short_str,
    fpd_key_as_short_str,
  );
}

/**
 * Returns the medium-length display string for the given `PropKey`.
 *
 * @see comp_key_as_med_str original implementation for `CompKey` values in Rust.
 * @see ratio_key_as_med_str original implementation for `RatioKey` values in Rust.
 * @see fpd_key_as_med_str original implementation for `FpdKey` values in Rust.
 */
export function prop_key_as_med_str(prop_key: PropKey): string {
  return dispatchPropKey(prop_key, comp_key_as_med_str, ratio_key_as_med_str, fpd_key_as_med_str);
}

/**
 * Returns the full-length display string for the given `PropKey`.
 *
 * @see comp_key_as_long_str original implementation for `CompKey` values in Rust.
 * @see ratio_key_as_long_str original implementation for `RatioKey` values in Rust.
 * @see fpd_key_as_long_str original implementation for `FpdKey` values in Rust.
 */
export function prop_key_as_long_str(prop_key: PropKey): string {
  return dispatchPropKey(
    prop_key,
    comp_key_as_long_str,
    ratio_key_as_long_str,
    fpd_key_as_long_str,
  );
}

/** Returns the numeric value of the given `PropKey` from the provided `MixProperties`. */
export function getMixProperty(mixProperties: MixProperties, prop_key: PropKey): number {
  return dispatchPropKey(
    prop_key,
    (k) => mixProperties.composition.get(k),
    (k) => mixProperties.composition.get_ratio(k),
    (k) => mixProperties.fpd.get(k),
  );
}
