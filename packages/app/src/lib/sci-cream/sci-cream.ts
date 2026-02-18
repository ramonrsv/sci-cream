import {
  CompKey,
  FpdKey,
  PropKey,
  compToPropKey,
  fpdToPropKey,
  isCompKey,
} from "@workspace/sci-cream";

export function isCompKeyQuantity(prop_key: CompKey): boolean {
  return (
    prop_key !== CompKey.AbsPAC &&
    prop_key !== CompKey.EmulsifiersPerFat &&
    prop_key !== CompKey.StabilizersPerWater
  );
}

export function isPropKeyQuantity(prop_key: PropKey): boolean {
  return (
    isCompKey(prop_key) &&
    prop_key !== compToPropKey(CompKey.AbsPAC) &&
    prop_key !== compToPropKey(CompKey.EmulsifiersPerFat) &&
    prop_key !== compToPropKey(CompKey.StabilizersPerWater)
  );
}

// @todo These are temporary just to test the properties chart "acceptable range" feature; it
// should eventually be replaced with a more robust solution implemented in the `sci-cream` crate.
export function getAcceptablePropertyRange(
  propKey: PropKey,
): { min: number; max: number } | undefined {
  switch (propKey) {
    case compToPropKey(CompKey.MSNF):
      return { min: 5, max: 15 };
    case compToPropKey(CompKey.TotalSolids):
      return { min: 30, max: 43 };
    case fpdToPropKey(FpdKey.ServingTemp):
      return { min: -18, max: -10 };
    default:
      return undefined;
  }
}
