import {
  CompKey,
  FpdKey,
  KeyScope,
  PropKey,
  compToPropKey,
  fpdToPropKey,
  getTypicalBalancingKeys,
  getWasmEnums,
  groupEnabledKeys,
  isCompKey,
  isRatioKey,
  propToRatioKey,
  getMixProperty,
  ratio_key_scope,
  type GroupOptions,
  propToCompKey,
  getPropKeys,
  getRatioKeyParts,
} from "@workspace/sci-cream";

import { Recipe, RecipeSummary } from "@/lib/recipe";

import type { OrderedKeyRow } from "@/lib/group-by";

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

/** Mix-scope property keys: all `getPropKeys`, minus ingredient-only ratio keys. */
export function getMixScopePropKeys(): PropKey[] {
  return getPropKeys().filter(isPropKeyMixScope);
}

/** `PropKey`→`CompKey` inverse of `compToPropKey` over every `CompKey`; stable, so built once. */
const PROP_TO_COMP_KEY = new Map<PropKey, CompKey>(
  getWasmEnums(CompKey).map((key) => [compToPropKey(key), key]),
);

/**
 * `CompKey`-space wrapper around `groupEnabledKeys` (which lives in `PropKey` space): groups the
 * keys as `PropKey`s, then maps each result back to its `CompKey` via the shared inverse map.
 */
export function groupEnabledCompKeys(
  keys: CompKey[],
  options: GroupOptions = {},
): OrderedKeyRow<CompKey>[] {
  return groupEnabledKeys(keys.map(compToPropKey), options).flatMap(({ key, depth, isRollup }) => {
    const comp = PROP_TO_COMP_KEY.get(key);
    return comp === undefined ? [] : [{ key: comp, depth, isRollup }];
  });
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

/**
 * Default set of property keys shown when the Custom key filter is first initialized.
 *
 * This is used by {@link PropertiesChartView} and {@link WatchersView} to determine which
 * properties to show by default when the user has not yet selected any custom properties. The set
 * is sci-cream's "typical" balancing keys, plus the serving temperature and hardness at 14°C.
 */
export const DEFAULT_SELECTED_PROPERTIES: Set<PropKey> = new Set(
  getTypicalBalancingKeys().concat([
    fpdToPropKey(FpdKey.ServingTemp),
    fpdToPropKey(FpdKey.HardnessAt14C),
  ]),
);

/**
 * Keys that are always considered active for the auto heuristic - shown for empty recipes
 *
 * These keys will be shown in the {@link PropertiesChartView} and {@link WatchersView} even if all
 * recipe slots are empty. This ensures that there are always some display elements visible in the
 * chart and watchers view, as opposed to a blank panel.
 */
export const UNCONDITIONAL_AUTO_PROPERTIES: Set<PropKey> = new Set([
  compToPropKey(CompKey.TotalSolids),
  compToPropKey(CompKey.POD),
  fpdToPropKey(FpdKey.ServingTemp),
  fpdToPropKey(FpdKey.HardnessAt14C),
]);

/**
 * Make a function that returns `true` for all active keys in `DEFAULT_SELECTED_PROPERTIES`.
 *
 * This can be used to create an `autoHeuristic` function for {@link getEnabledKeys} that will
 * filter out inactive keys from the default selection, to avoid cluttering the UI. A key is active
 * if it has a non-zero value in any reference recipe, or in any ingredient in the main recipe.
 * {@link RatioKey}s are also considered active if the numerator and denominator keys are active.
 * Keys in {@link UNCONDITIONAL_AUTO_PROPERTIES} are always unconditionally considered active.
 *
 * See {@link PropertiesChartView} and {@link WatchersView} for current users of this function.
 */
export function makeAutoHeuristicFunction(
  main: Recipe,
  refs: RecipeSummary[],
): (propKey: PropKey) => boolean {
  const isActiveValue = (value: number) => !Number.isNaN(value) && value !== 0;

  const isCompKeyActive = (propKey: PropKey) =>
    main.ingredientRows.some((row) =>
      isActiveValue(row.ingredient?.composition.get(propToCompKey(propKey)) ?? NaN),
    );

  const isRatioKeyActive = (propKey: PropKey) => {
    const [num, den] = getRatioKeyParts(propToRatioKey(propKey));
    return isCompKeyActive(num) && isCompKeyActive(den);
  };

  const isActive = (propKey: PropKey) => {
    return (
      UNCONDITIONAL_AUTO_PROPERTIES.has(propKey) ||
      (isCompKey(propKey)
        ? isCompKeyActive(propKey)
        : isRatioKey(propKey)
          ? isRatioKeyActive(propKey)
          : true) ||
      refs.some((ref) => isActiveValue(getMixProperty(ref.mixProperties, propKey)))
    );
  };

  return (propKey: PropKey) => {
    return DEFAULT_SELECTED_PROPERTIES.has(propKey) && isActive(propKey);
  };
}
