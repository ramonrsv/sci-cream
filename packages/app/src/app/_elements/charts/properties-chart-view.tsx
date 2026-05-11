"use client";

import { ReactNode, useState } from "react";

import { RecipeSummary, isRecipeEmpty } from "@/app/_components/recipe";
import {
  KeyFilter,
  KeyFilterSelect,
  getEnabledKeys,
} from "@/app/_elements/selects/key-filter-select";
import { PropertiesBarChart, getPropKeys } from "@/app/_elements/charts/properties-bar-chart";
import { STATE_VAL } from "@/lib/util";

import {
  CompKey,
  FpdKey,
  PropKey,
  compToPropKey,
  fpdToPropKey,
  getMixProperty,
  prop_key_as_med_str,
} from "@workspace/sci-cream";

/** Default set of property keys shown when the Custom key filter is first initialized */
export const DEFAULT_SELECTED_PROPERTIES: Set<PropKey> = new Set([
  compToPropKey(CompKey.MilkFat),
  compToPropKey(CompKey.TotalFats),
  compToPropKey(CompKey.MSNF),
  compToPropKey(CompKey.TotalSolids),
  compToPropKey(CompKey.Water),
  compToPropKey(CompKey.TotalSugars),
  compToPropKey(CompKey.StabilizersPerWater),
  compToPropKey(CompKey.POD),
  compToPropKey(CompKey.PACtotal),
  compToPropKey(CompKey.AbsPAC),
  fpdToPropKey(FpdKey.ServingTemp),
] as PropKey[]);

/**
 * Properties bar chart with an attached toolbar (KeyFilter) that owns its own toolbar state.
 *
 * `toolbarPrefix` is rendered inside the toolbar's flex row before the controls; used by the
 * panel wrapper to inject a drag handle without breaking the toolbar layout.
 */
export function PropertiesChartView({
  main,
  refs = [],
  toolbarPrefix,
  defaultSelected = DEFAULT_SELECTED_PROPERTIES,
}: {
  main: RecipeSummary;
  refs?: RecipeSummary[];
  toolbarPrefix?: ReactNode;
  defaultSelected?: Set<PropKey>;
}) {
  const propsFilterState = useState<KeyFilter>(KeyFilter.Auto);
  const selectedPropsState = useState<Set<PropKey>>(defaultSelected);

  /** Returns `true` when every recipe has a zero/NaN value for the given property key */
  const isPropEmpty = (propKey: PropKey) => {
    const recipes = [main, ...refs];
    if (recipes.every((r) => isRecipeEmpty(r))) return true;

    for (const recipe of recipes) {
      const propVal = getMixProperty(recipe.mixProperties, propKey);
      if (!(propVal === 0 || Number.isNaN(propVal))) {
        return false;
      }
    }
    return true;
  };

  /** Auto-filter heuristic: includes a property key when it is part of the default selection */
  const autoHeuristic = (propKey: PropKey) => defaultSelected.has(propKey);

  /** Returns the list of property keys to display, based on the current filter and selection */
  const getEnabledProps = () => {
    return getEnabledKeys(
      propsFilterState[STATE_VAL],
      selectedPropsState[STATE_VAL],
      getPropKeys,
      isPropEmpty,
      autoHeuristic,
    );
  };

  return (
    <>
      <div className="flex items-center">
        {toolbarPrefix}
        <KeyFilterSelect
          supportedKeyFilters={[KeyFilter.Auto, KeyFilter.Custom]}
          keyFilterState={propsFilterState}
          selectedKeysState={selectedPropsState}
          getKeys={getPropKeys}
          key_as_med_str={prop_key_as_med_str}
        />
      </div>
      <div className="h-[calc(100%-33px)] px-2 pb-2">
        <PropertiesBarChart main={main} refs={refs} propKeys={getEnabledProps()} />
      </div>
    </>
  );
}
