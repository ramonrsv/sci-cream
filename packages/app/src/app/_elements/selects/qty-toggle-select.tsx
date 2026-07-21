"use client";

import { leafKey, usePersistedState } from "@/lib/hooks/use-persisted-state";

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

/**
 * Persisted `[value, setter, supportedQtyToggles]` tuple for a {@link QtyToggle} selection.
 *
 * `supportedQtyToggles` constrains which `QtyToggle` values are valid for this site — stored values
 * outside that list are rejected and fall back to `defaultValue`. Defaults to all `QtyToggle`
 * values when omitted. `defaultValue` is typed as `Toggles[number]` (a compile-time error if it is
 * not in `supportedQtyToggles`), and defaults to the first supported toggle.
 *
 * When `persistKey` is `undefined`, it behaves as a plain `useState` (no storage touched). The
 * stored leaf key is `${persistKey}:qty`.
 */
export function useQtyToggleState<const Toggles extends [QtyToggle, ...QtyToggle[]]>(
  persistKey: string | undefined,
  {
    supportedQtyToggles = Object.values(QtyToggle) as unknown as Toggles,
    defaultValue = supportedQtyToggles[0],
  }: { supportedQtyToggles?: Toggles; defaultValue?: Toggles[number] } = {},
): [QtyToggle, React.Dispatch<React.SetStateAction<QtyToggle>>, Toggles] {
  const [value, setValue] = usePersistedState(leafKey(persistKey, "qty"), defaultValue, {
    isValid: (v) => (supportedQtyToggles as QtyToggle[]).includes(v),
  });

  return [value, setValue, supportedQtyToggles];
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
