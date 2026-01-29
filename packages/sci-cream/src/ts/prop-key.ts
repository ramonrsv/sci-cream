import {
  CompKey,
  FpdKey,
  comp_key_as_med_str,
  fpd_key_as_med_str,
  MixProperties,
} from "../../wasm/index";

import { getTsEnumStringKeys } from "./util";

export const PropKeyObj = { ...CompKey, ...FpdKey } as const;

export type PropKey = keyof typeof PropKeyObj;

export function compToPropKey(comp_key: CompKey): PropKey {
  return CompKey[comp_key] as PropKey;
}

export function fpdToPropKey(fpd_key: FpdKey): PropKey {
  return FpdKey[fpd_key] as PropKey;
}

export function isCompKey(prop_key: PropKey): boolean {
  return getTsEnumStringKeys(CompKey).includes(prop_key as keyof typeof CompKey);
}

export function isFpdKey(prop_key: PropKey): boolean {
  return getTsEnumStringKeys(FpdKey).includes(prop_key as keyof typeof FpdKey);
}

/// It's necessary to use this functions instead of Object.keys(PropKeyObj) in order to maintain
/// the correct order of the keys as given by getTsEnumStringKeys(CompKey) and (FpdKey) enums.
/// @note getTsEnumStringKeys(PropKeyObj) does not work correctly, since it uses Object.values(...)
/// Object.keys(PropKeyObj) should be used to get the correct and unique string keys of PropKeyObj.
export function getPropKeys(): PropKey[] {
  return [...getTsEnumStringKeys(CompKey), ...getTsEnumStringKeys(FpdKey)] as PropKey[];
}

export function prop_key_as_med_str(prop_key: PropKey): string {
  if (isCompKey(prop_key)) {
    return comp_key_as_med_str(CompKey[prop_key as keyof typeof CompKey]);
  } else if (isFpdKey(prop_key)) {
    return fpd_key_as_med_str(FpdKey[prop_key as keyof typeof FpdKey]);
  } else {
    throw new Error("Invalid PropKey: " + prop_key);
  }
}

export function getMixProperty(mixProperties: MixProperties, prop_key: PropKey): number {
  if (isCompKey(prop_key)) {
    return mixProperties.composition.get(CompKey[prop_key as keyof typeof CompKey]);
  } else if (isFpdKey(prop_key)) {
    return mixProperties.fpd.get(FpdKey[prop_key as keyof typeof FpdKey]);
  } else {
    throw new Error("Invalid PropKey: " + prop_key);
  }
}
