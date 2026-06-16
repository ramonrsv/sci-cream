"use client";

import { leafKey, usePersistedState } from "@/lib/use-persisted-state";

import { Select, type SelectOption } from "@/app/_elements/selects/select";

/** Controls how ingredient and mix quantity composition values are displayed */
export enum QtyToggle {
  /// The raw composition value as stored in the Ingredient, independent of quantity
  Composition = "Composition",
  /// The quantity in grams based on the ingredient quantity in the recipe
  Quantity = "Quantity (g)",
  /// The percentage of the mix based on the ingredient quantity and total mix quantity
  Percentage = "Quantity (%)",
}

/** Short label for each `QtyToggle` option, shown in the UI. */
export const QTY_TOGGLE_SHORT_LABELS: Record<QtyToggle, string> = {
  [QtyToggle.Composition]: "Comp.",
  [QtyToggle.Quantity]: "Qty (g)",
  [QtyToggle.Percentage]: "Qty (%)",
};

/** Returns `true` when `value` is a valid {@link QtyToggle} enum member. */
function isQtyToggle(value: unknown): value is QtyToggle {
  return (Object.values(QtyToggle) as unknown[]).includes(value);
}

/**
 * Persisted `[value, setter]` tuple for a {@link QtyToggle} selection.
 *
 * When `persistKey` is `undefined`, it behaves as a plain `useState` (no storage touched). The
 * stored leaf key is `${persistKey}:qty`. Stored values are validated via {@link isQtyToggle}.
 */
export function useQtyToggleState(
  persistKey: string | undefined,
  defaultValue: QtyToggle = QtyToggle.Percentage,
): [QtyToggle, React.Dispatch<React.SetStateAction<QtyToggle>>] {
  return usePersistedState(leafKey(persistKey, "qty"), defaultValue, { isValid: isQtyToggle });
}

/** Select element for switching between `QtyToggle` display modes */
export function QtyToggleSelect({
  supportedQtyToggles,
  qtyToggleState,
}: {
  supportedQtyToggles: QtyToggle[];
  qtyToggleState: [QtyToggle, React.Dispatch<React.SetStateAction<QtyToggle>>];
}) {
  const [qtyToggle, setQtyToggle] = qtyToggleState;

  const options: SelectOption<QtyToggle>[] = supportedQtyToggles.map((qt) => ({
    value: qt,
    label: QTY_TOGGLE_SHORT_LABELS[qt],
  }));

  return (
    <div id="qty-toggle-select">
      <Select value={qtyToggle} onChange={setQtyToggle} options={options} />
    </div>
  );
}
