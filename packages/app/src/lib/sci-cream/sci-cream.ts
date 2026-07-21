import {
  CompKey,
  FpdKey,
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
  type GroupOptions,
  propToCompKey,
  getRatioKeyParts,
} from "@workspace/sci-cream";

import { Recipe, RecipeSummary } from "@/lib/recipe/recipe";

import type { OrderedKeyRow } from "@/lib/group-by";

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
 * Default set of property keys shown when the Custom key filter is first initialized.
 *
 * This is used by {@link PropertiesChartView} and {@link WatchersView} to determine which
 * properties to show by default when the user has not yet selected any custom properties.
 *
 * The set is sci-cream's "typical" balancing keys.
 */
export const DEFAULT_SELECTED_PROPERTIES: Set<PropKey> = new Set(getTypicalBalancingKeys());

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
  fpdToPropKey(FpdKey.FPD),
  fpdToPropKey(FpdKey.ServingTemp),
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
