import {
  CompKey,
  FpdKey,
  PropKey,
  compToPropKey,
  fpdToPropKey,
  isCompKey,
} from "@workspace/sci-cream";

/** Returns `true` when a `CompKey` represents a quantity (g) rather than a dimensionless ratio */
export function isCompKeyQuantity(prop_key: CompKey): boolean {
  return (
    prop_key !== CompKey.AbsPAC &&
    prop_key !== CompKey.EmulsifiersPerFat &&
    prop_key !== CompKey.StabilizersPerWater
  );
}

/** Returns `true` when a `PropKey` is for a quantity `CompKey` (excludes FPD & ratio comp keys) */
export function isPropKeyQuantity(prop_key: PropKey): boolean {
  return (
    isCompKey(prop_key) &&
    prop_key !== compToPropKey(CompKey.AbsPAC) &&
    prop_key !== compToPropKey(CompKey.EmulsifiersPerFat) &&
    prop_key !== compToPropKey(CompKey.StabilizersPerWater)
  );
}

/**
 * Return the acceptable `{ min, max }` range for a property key, or `undefined` if none is defined.
 *
 * @todo These ranges are temporary placeholders for the prop chart's "acceptable range" feature;
 * should eventually be replaced with a more robust solution implemented in the `sci-cream` crate.
 */
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
