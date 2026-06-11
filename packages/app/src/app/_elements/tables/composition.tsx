"use client";

import { ReactNode, useState } from "react";

import { QtyToggle } from "@/app/_elements/selects/qty-toggle-select";
import {
  KeyFilter,
  KeyFilterSelect,
  getEnabledKeys,
} from "@/app/_elements/selects/key-filter-select";

import { applyQtyToggleAndFormat } from "@/lib/comp-value-format";
import { getCompKeys } from "@/app/_elements/tables/composition-breakdown";
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
}: {
  composition: Composition;
  compKeys: CompKey[];
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

  return (
    <table>
      <thead>
        <tr className="h-6.25">
          <th className="table-header w-full px-1.25">Property</th>
          <th className="table-header px-1.25 text-center">g / 100g</th>
        </tr>
      </thead>
      <tbody>
        {compKeys.map((compKey) => (
          <tr key={String(compKey)} className="h-6.25">
            <td className="table-header w-full px-1.25 text-center">
              {comp_key_as_med_str(compKey)}
            </td>
            <td className="table-inner-cell comp-val px-1.25">{formattedCell(compKey)}</td>
          </tr>
        ))}
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
}: {
  composition: Composition;
  toolbarPrefix?: ReactNode;
  defaultSelected?: Set<CompKey>;
}) {
  const compsFilterState = useState<KeyFilter>(KeyFilter.Active);
  const selectedCompsState = useState<Set<CompKey>>(defaultSelected);

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

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center">
        {toolbarPrefix}
        <KeyFilterSelect
          supportedKeyFilters={[KeyFilter.Active, KeyFilter.All, KeyFilter.Custom]}
          keyFilterState={compsFilterState}
          selectedKeysState={selectedCompsState}
          getKeys={getCompKeys}
          key_as_med_str={comp_key_as_med_str}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto whitespace-nowrap">
        <CompositionTable composition={composition} compKeys={getEnabledComps()} />
      </div>
    </div>
  );
}
