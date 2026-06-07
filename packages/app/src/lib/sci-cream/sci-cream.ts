import {
  CompKey,
  FpdKey,
  KeyScope,
  PropKey,
  compToPropKey,
  fpdToPropKey,
  isCompKey,
  isRatioKey,
  propToRatioKey,
  ratio_key_scope,
} from "@workspace/sci-cream";

/**
 * Returns `true` when a `PropKey` is a quantity (g, additive and scalable by ingredient amount).
 *
 * Every `CompKey` is extensive (additive), so this is exactly `isCompKey`: `FpdKey` and `RatioKey`
 * prop keys are non-additive (intensive), not grams, and never multiplied by an ingredient amount.
 */
export function isPropKeyQuantity(prop_key: PropKey): boolean {
  return isCompKey(prop_key);
}

/**
 * Returns `true` when a `PropKey` is meaningful in a whole-mix context, not per-ingredient.
 *
 * Non-ratio keys are always mix-meaningful. A ratio key is filtered out only when its
 * `KeyScope` is `Ingredient` (e.g. sweetener-classification ratios like PAC:POD that describe a
 * single ingredient, not a mix). Used to filter property/target dropdowns for mix composition.
 */
export function isPropKeyMixScope(prop_key: PropKey): boolean {
  return !isRatioKey(prop_key) || ratio_key_scope(propToRatioKey(prop_key)) !== KeyScope.Ingredient;
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
