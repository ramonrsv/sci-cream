import { CompKey, PropKeyObj, getPropKeys as getPropKeysJS, isCompKey } from "@workspace/sci-cream";
import { getWasmEnums } from "../util";

// @todo For some reason `getWasmEnums(CompKey)` seems to still trip up the code analysis,
// so for now implement this helper function which seems to be well understood by the analyzer.
export function getCompKeys(): CompKey[] {
  return getWasmEnums(CompKey).map((e) => e as unknown as CompKey);
}

// @todo Type information is lost when exporting with wasm-pack, so re-create it here.
export type PropKey = keyof typeof PropKeyObj;

// @todo Type information is lost when exporting with wasm-pack, so re-create it here.
export function getPropKeys(): PropKey[] {
  return getPropKeysJS() as PropKey[];
}

export const isCompKeyQuantity = (prop_key: CompKey): boolean => {
  return (
    prop_key !== CompKey.AbsPAC &&
    prop_key !== CompKey.EmulsifiersPerFat &&
    prop_key !== CompKey.StabilizersPerWater
  );
};

export const isPropKeyQuantity = (prop_key: PropKey): boolean => {
  return (
    isCompKey(prop_key) &&
    prop_key !== CompKey[CompKey.AbsPAC] &&
    prop_key !== CompKey[CompKey.EmulsifiersPerFat] &&
    prop_key !== CompKey[CompKey.StabilizersPerWater]
  );
};
