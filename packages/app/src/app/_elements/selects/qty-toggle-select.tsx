"use client";

import { Select, type SelectOption } from "./select";

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
