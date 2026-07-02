"use client";

import { ReactNode } from "react";

import { QtyToggle } from "@/app/_elements/selects/qty-toggle-select";
import {
  KeyFilter,
  KeyFilterSelect,
  getEnabledKeys,
  useKeyFilterState,
} from "@/app/_elements/selects/key-filter-select";

import { applyQtyToggleAndFormat } from "@/lib/comp-value-format";
import { getCompKeys } from "@/app/_elements/tables/composition-breakdown";
import { groupEnabledCompKeys } from "@/lib/sci-cream/sci-cream";
import { useOrderKeys } from "@/lib/group-by";
import { STATE_VAL } from "@/lib/util";

import { CompKey, Composition, comp_key_as_med_str } from "@workspace/sci-cream";

/**
 * Bare presentational table showing the composition values of a single ingredient.
 *
 * Rows are the provided `compKeys`, values are read from `composition` via `Composition.get` and
 * displayed as g/100g of ingredient. The caller owns key filtering and any scroll/size chrome.
 */
export function CompositionTable({
  composition,
  compKeys,
  rowMeta,
}: {
  composition: Composition;
  compKeys: CompKey[];
  /**
   * Optional per-row hierarchy metadata, parallel to `compKeys`. When present, labels indent by
   * `depth` and roll-up rows are emphasized; when absent, rows render flat and centered.
   */
  rowMeta?: ReadonlyArray<{ depth: number; isRollup: boolean }>;
}) {
  const formattedCell = (compKey: CompKey) => {
    return applyQtyToggleAndFormat(
      composition.get(compKey),
      undefined,
      undefined,
      QtyToggle.Composition,
      true,
    );
  };

  /** Class + style for a property label cell, indenting/emphasizing grouped rows when grouped. */
  const labelCell = (meta: { depth: number; isRollup: boolean } | undefined) => {
    if (meta === undefined) {
      return { className: "table-emphasis w-full px-1.25 text-center", style: undefined };
    }
    return {
      className: "table-emphasis w-full pr-1.25 text-left",
      style: {
        paddingLeft: `${meta.depth * 1 + 0.5}rem`,
        fontWeight: meta.isRollup ? undefined : "normal",
      },
    };
  };

  return (
    <table className="border-separate border-spacing-0">
      <thead className="table-sticky-head">
        <tr className="h-6.5">
          <th className="table-col-header w-full px-1.25">Property</th>
          <th className="table-col-header px-1.25 text-center">g / 100g</th>
        </tr>
      </thead>
      <tbody>
        {compKeys.map((compKey, i) => {
          const { className, style } = labelCell(rowMeta?.[i]);
          return (
            <tr key={`${String(compKey)}-${i}`} className="h-6.25">
              <td className={className} style={style}>
                {comp_key_as_med_str(compKey)}
              </td>
              <td className="table-inner-cell comp-val px-1.25">{formattedCell(compKey)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * Composition table with an attached toolbar (KeyFilter) that owns its own toolbar state. Renders
 * a single ingredient's composition values; suitable for ingredient-search detail panels.
 *
 * `toolbarPrefix` is rendered inside the toolbar's flex row before the controls; used by panel
 * wrappers to inject a drag handle without breaking the toolbar layout.
 */
export function CompositionView({
  composition,
  toolbarPrefix,
  defaultSelected = new Set(),
  persistKey,
}: {
  composition: Composition;
  toolbarPrefix?: ReactNode;
  defaultSelected?: Set<CompKey>;
  persistKey?: string;
}) {
  const {
    keyFilterState: compsFilterState,
    selectedKeysState: selectedCompsState,
    supportedKeyFilters,
  } = useKeyFilterState(persistKey, {
    defaultSelected,
    getKeys: getCompKeys,
    supportedKeyFilters: [KeyFilter.Active, KeyFilter.All, KeyFilter.Custom],
  });

  const orderKeys = useOrderKeys<CompKey>(groupEnabledCompKeys);

  /** Returns `true` when the composition value for the given key is zero or NaN */
  const isPropEmpty = (compKey: CompKey) => {
    const v = composition.get(compKey);
    return v === 0 || Number.isNaN(v);
  };

  /** Returns the list of composition keys to display, based on the current filter and selection */
  const getEnabledComps = () => {
    return getEnabledKeys(
      compsFilterState[STATE_VAL],
      selectedCompsState[STATE_VAL],
      getCompKeys,
      isPropEmpty,
      () => false,
    );
  };

  const enabledComps = getEnabledComps();
  const orderedComps = orderKeys?.(enabledComps);
  const compKeys = orderedComps ? orderedComps.map((row) => row.key) : enabledComps;
  const rowMeta = orderedComps?.map((row) => ({ depth: row.depth, isRollup: row.isRollup }));

  return (
    <div className="flex h-full flex-col">
      <div className="toolbar">
        {toolbarPrefix}
        <KeyFilterSelect
          supportedKeyFilters={supportedKeyFilters}
          keyFilterState={compsFilterState}
          selectedKeysState={selectedCompsState}
          getKeys={getCompKeys}
          key_as_med_str={comp_key_as_med_str}
          orderKeys={orderKeys}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto whitespace-nowrap">
        <CompositionTable composition={composition} compKeys={compKeys} rowMeta={rowMeta} />
      </div>
    </div>
  );
}
