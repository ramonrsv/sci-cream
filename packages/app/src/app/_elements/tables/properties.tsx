"use client";

import { Fragment, ReactNode } from "react";

import { RecipeSummary, isRecipeEmpty } from "@/lib/recipe";
import {
  KeyFilterSelect,
  getEnabledKeys,
  useKeyFilterState,
} from "@/app/_elements/selects/key-filter-select";
import {
  QtyToggle,
  QtyToggleSelect,
  useQtyToggleState,
} from "@/app/_elements/selects/qty-toggle-select";
import {
  DeltaToggle,
  DeltaToggleSelect,
  useDeltaToggleState,
} from "@/app/_elements/selects/delta-toggle-select";
import { useOrderKeys } from "@/lib/group-by";
import { applyQtyToggleAndFormat, computeDeltaAndFormat } from "@/lib/comp-value-format";
import { STATE_VAL } from "@/lib/util";

import {
  CompKey,
  RatioKey,
  FpdKey,
  PropKey,
  compToPropKey,
  ratioToPropKey,
  fpdToPropKey,
  getMixScopePropKeys,
  isPropKeyQuantity,
  groupEnabledKeys,
  getMixProperty,
  MixProperties,
  prop_key_as_med_str,
} from "@workspace/sci-cream";

/** Default set of property keys shown when the Custom key filter is first initialized */
export const DEFAULT_SELECTED_PROPERTIES: Set<PropKey> = new Set([
  compToPropKey(CompKey.MilkFat),
  compToPropKey(CompKey.EggFat),
  compToPropKey(CompKey.CocoaButter),
  compToPropKey(CompKey.NutFat),
  compToPropKey(CompKey.OtherFats),
  compToPropKey(CompKey.TotalFats),
  compToPropKey(CompKey.MSNF),
  compToPropKey(CompKey.EggSNF),
  compToPropKey(CompKey.CocoaSolids),
  compToPropKey(CompKey.NutSNF),
  compToPropKey(CompKey.TotalSNF),
  compToPropKey(CompKey.TotalSNFS),
  compToPropKey(CompKey.TotalSolids),
  compToPropKey(CompKey.Water),
  compToPropKey(CompKey.TotalSugars),
  compToPropKey(CompKey.TotalArtificial),
  compToPropKey(CompKey.TotalPAC),
  ratioToPropKey(RatioKey.AbsPAC),
  fpdToPropKey(FpdKey.FPD),
  fpdToPropKey(FpdKey.ServingTemp),
  fpdToPropKey(FpdKey.HardnessAt14C),
] as PropKey[]);

/**
 * Bare presentational table showing mix property values across one or more recipes.
 *
 * Columns are the provided recipes (header: `recipe.id`), rows are the provided `propKeys`. The
 * caller owns recipe/key filtering, toolbar state, and any scroll/size chrome.
 *
 * When `deltaToggle` is not `Off`, the first recipe (`recipes[0]`) is the baseline: every later
 * (reference) recipe gains an adjacent delta column showing `main − ref`, as absolute or relative.
 */
export function PropertiesTable({
  recipes,
  propKeys,
  qtyToggle,
  deltaToggle = DeltaToggle.Off,
  rowMeta,
}: {
  recipes: RecipeSummary[];
  propKeys: PropKey[];
  qtyToggle: QtyToggle;
  deltaToggle?: DeltaToggle;
  /**
   * Optional per-row hierarchy metadata, parallel to `propKeys`. When present, labels indent by
   * `depth` and roll-up rows are emphasized; when absent, rows render flat and centered.
   */
  rowMeta?: ReadonlyArray<{ depth: number; isRollup: boolean }>;
}) {
  const main = recipes[0];
  const showDelta = deltaToggle !== DeltaToggle.Off;

  /** Formats a main cell for the given property and mix. */
  const formatCompCell = (propKey: PropKey, mixProperties: MixProperties, mixTotal: number) => {
    return applyQtyToggleAndFormat(
      getMixProperty(mixProperties, propKey),
      mixTotal,
      mixTotal,
      qtyToggle,
      isPropKeyQuantity(propKey),
    );
  };

  /** Formats a reference cell as a `main − reference` delta for the given property. */
  const formatDeltaCell = (propKey: PropKey, recipe: RecipeSummary) => {
    return computeDeltaAndFormat(
      getMixProperty(main.mixProperties, propKey),
      main.mixTotal,
      getMixProperty(recipe.mixProperties, propKey),
      recipe.mixTotal,
      qtyToggle,
      isPropKeyQuantity(propKey),
      deltaToggle === DeltaToggle.Relative,
    );
  };

  /** Class + style for a property label cell, indenting/emphasizing grouped rows when grouped. */
  const labelCell = (meta: { depth: number; isRollup: boolean } | undefined) => {
    if (meta === undefined) {
      return { className: "table-header w-full px-1.25 text-center", style: undefined };
    }
    return {
      className: "table-header w-full pr-1.25 text-left",
      style: {
        paddingLeft: `${meta.depth * 1 + 0.5}rem`,
        fontWeight: meta.isRollup ? undefined : "normal",
      },
    };
  };

  return (
    <table>
      <thead>
        <tr className="h-6.25">
          <th className="table-header w-full px-1.25">Property</th>
          {recipes.map((recipe, i) => (
            <Fragment key={recipe.id}>
              <th className="table-header px-1.25 text-center">{recipe.id}</th>
              {showDelta && i > 0 && (
                <th className="table-header px-1.25 text-center">
                  {`Δ${deltaToggle === DeltaToggle.Relative ? " %" : ""}`}
                </th>
              )}
            </Fragment>
          ))}
        </tr>
      </thead>
      <tbody>
        {propKeys.map((propKey, i) => {
          const { className, style } = labelCell(rowMeta?.[i]);
          return (
            <tr key={`${String(propKey)}-${i}`} className="h-6.25">
              <td className={className} style={style}>
                {prop_key_as_med_str(propKey)}
              </td>
              {recipes.map((recipe, i) => (
                <Fragment key={recipe.id}>
                  <td className="table-inner-cell comp-val px-1.25">
                    {formatCompCell(propKey, recipe.mixProperties, recipe.mixTotal!)}
                  </td>
                  {showDelta && i > 0 && (
                    <td className="table-inner-cell comp-val px-1.25">
                      {formatDeltaCell(propKey, recipe)}
                    </td>
                  )}
                </Fragment>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * Properties table with an attached toolbar (QtyToggle + KeyFilter) that owns its own toolbar
 * state. Renders all provided recipes as columns; the caller is responsible for slot filtering.
 *
 * `toolbarPrefix` is rendered inside the toolbar's flex row before the controls; used by the panel
 * wrapper to inject a drag handle without breaking the toolbar layout.
 */
export function PropertiesView({
  recipes,
  toolbarPrefix,
  defaultSelected = DEFAULT_SELECTED_PROPERTIES,
  persistKey,
}: {
  recipes: RecipeSummary[];
  toolbarPrefix?: ReactNode;
  defaultSelected?: Set<PropKey>;
  persistKey?: string;
}) {
  const [qtyToggle, setQtyToggle, supportedQtyToggles] = useQtyToggleState(persistKey, {
    supportedQtyToggles: [QtyToggle.Quantity, QtyToggle.Percentage],
    defaultValue: QtyToggle.Percentage,
  });
  const [deltaToggle, setDeltaToggle, supportedDeltaToggles] = useDeltaToggleState(persistKey, {
    defaultValue: DeltaToggle.Off,
  });
  const {
    keyFilterState: propsFilterState,
    selectedKeysState: selectedPropsState,
    supportedKeyFilters,
  } = useKeyFilterState(persistKey, { defaultSelected, getKeys: getMixScopePropKeys });

  const orderKeys = useOrderKeys<PropKey>(groupEnabledKeys);

  /**
   * Returns `true` when the given property key has a zero/NaN value across all provided recipes.
   *
   * Treats all keys as empty when every recipe is itself empty, which avoids showing non-zero
   * default values (e.g. `PropKey.Water`) for an otherwise blank set of recipes.
   */
  const isPropEmpty = (propKey: PropKey) => {
    if (recipes.every((recipe) => isRecipeEmpty(recipe))) {
      return true;
    }

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
      getMixScopePropKeys,
      isPropEmpty,
      autoHeuristic,
    );
  };

  const enabledProps = getEnabledProps();

  const orderedProps = orderKeys?.(enabledProps);
  const propKeys = orderedProps ? orderedProps.map((row) => row.key) : enabledProps;
  const rowMeta = orderedProps?.map((row) => ({ depth: row.depth, isRollup: row.isRollup }));

  return (
    <div className="flex h-full flex-col">
      <div className="toolbar">
        {toolbarPrefix}
        <QtyToggleSelect
          supportedQtyToggles={supportedQtyToggles}
          qtyToggleState={[qtyToggle, setQtyToggle]}
        />
        {recipes.length > 1 && (
          <DeltaToggleSelect
            supportedDeltaToggles={supportedDeltaToggles}
            deltaToggleState={[deltaToggle, setDeltaToggle]}
          />
        )}
        <KeyFilterSelect
          supportedKeyFilters={supportedKeyFilters}
          keyFilterState={propsFilterState}
          selectedKeysState={selectedPropsState}
          getKeys={getMixScopePropKeys}
          key_as_med_str={prop_key_as_med_str}
          orderKeys={orderKeys}
        />
      </div>
      <div
        data-testid="properties-table-pane"
        className="min-h-0 flex-1 overflow-y-auto whitespace-nowrap"
      >
        <PropertiesTable
          recipes={recipes}
          propKeys={propKeys}
          qtyToggle={qtyToggle}
          deltaToggle={deltaToggle}
          rowMeta={rowMeta}
        />
      </div>
    </div>
  );
}
