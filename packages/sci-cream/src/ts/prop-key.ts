import {
  CompKey,
  FpdKey,
  comp_key_as_med_str,
  fpd_key_as_med_str,
  MixProperties,
} from "../../wasm/index";

import { getTsEnumStringKeys } from "./util";

/** Union of all `CompKey` and `FpdKey` enum members, used as a unified property key type. */
export const PropKeyObj = { ...CompKey, ...FpdKey } as const;

export type PropKey = keyof typeof PropKeyObj;

/** Converts a `CompKey` enum value to its equivalent `PropKey`. */
export function compToPropKey(comp_key: CompKey): PropKey {
  return CompKey[comp_key] as PropKey;
}

/** Converts an `FpdKey` enum value to its equivalent `PropKey`. */
export function fpdToPropKey(fpd_key: FpdKey): PropKey {
  return FpdKey[fpd_key] as PropKey;
}

/** Returns true if the given `PropKey` corresponds to a `CompKey`. */
export function isCompKey(prop_key: PropKey): boolean {
  return getTsEnumStringKeys(CompKey).includes(prop_key as keyof typeof CompKey);
}

/** Returns true if the given `PropKey` corresponds to an `FpdKey`. */
export function isFpdKey(prop_key: PropKey): boolean {
  return getTsEnumStringKeys(FpdKey).includes(prop_key as keyof typeof FpdKey);
}

/**
 * Returns all `PropKey`s in the correct order: `CompKey` values first, then `FpdKey` values.
 *
 * It's necessary to use this function instead of `Object.keys(PropKeyObj)` in order to maintain
 * the correct order of the keys as given by `getTsEnumStringKeys(CompKey)` and `(FpdKey)` enums.
 *
 * **Note**: This function uses `getTsEnumStringKeys` on each enum separately rather than
 * `Object.keys(PropKeyObj)` to preserve the correct ordering. `getTsEnumStringKeys(PropKeyObj)`
 * does not work correctly since it uses `Object.values()` internally. `Object.keys(PropKeyObj)`
 * does produce the correct unique keys but does not guarantee the correct order, which is important
 * for any logic that relies on the order of the keys (e.g. consistent display order in UI).
 */
export function getPropKeys(): PropKey[] {
  return [...getTsEnumStringKeys(CompKey), ...getTsEnumStringKeys(FpdKey)] as PropKey[];
}

/**
 * Returns the medium-length display string for the given `PropKey`.
 *
 * @see comp_key_as_med_str original implementation for `CompKey` values in Rust.
 * @see fpd_key_as_med_str original implementation for `FpdKey` values in Rust.
 */
export function prop_key_as_med_str(prop_key: PropKey): string {
  if (isCompKey(prop_key)) {
    return comp_key_as_med_str(CompKey[prop_key as keyof typeof CompKey]);
  } else if (isFpdKey(prop_key)) {
    return fpd_key_as_med_str(FpdKey[prop_key as keyof typeof FpdKey]);
  } else {
    throw new Error("Invalid PropKey: " + prop_key);
  }
}

/** Returns the numeric value of the given `PropKey` from the provided `MixProperties`. */
export function getMixProperty(mixProperties: MixProperties, prop_key: PropKey): number {
  if (isCompKey(prop_key)) {
    return mixProperties.composition.get(CompKey[prop_key as keyof typeof CompKey]);
  } else if (isFpdKey(prop_key)) {
    return mixProperties.fpd.get(FpdKey[prop_key as keyof typeof FpdKey]);
  } else {
    throw new Error("Invalid PropKey: " + prop_key);
  }
}
