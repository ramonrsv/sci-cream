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

/** Gets short labels for the QtyToggle options to show in the UI */
export function qtyToggleToShortStr(qt: QtyToggle): string {
  switch (qt) {
    case QtyToggle.Composition:
      return "Comp.";
    case QtyToggle.Quantity:
      return "Qty (g)";
    case QtyToggle.Percentage:
      return "Qty (%)";
    default:
      throw new Error("Unsupported QtyToggle value");
  }
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
    label: qtyToggleToShortStr(qt),
  }));

  return (
    <div id="qty-toggle-select">
      <Select value={qtyToggle} onChange={setQtyToggle} options={options} />
    </div>
  );
}
