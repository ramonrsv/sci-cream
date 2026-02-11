"use client";

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

export function QtyToggleSelect({
  supportedQtyToggles,
  qtyToggleState,
}: {
  supportedQtyToggles: QtyToggle[];
  qtyToggleState: [QtyToggle, React.Dispatch<React.SetStateAction<QtyToggle>>];
}) {
  const [qtyToggle, setQtyToggle] = qtyToggleState;

  return (
    <div id="key-selection" className="mx-1">
      <select
        id={"qty-toggle-select"}
        className="select-input"
        value={qtyToggle}
        onChange={(e) => setQtyToggle(e.target.value as QtyToggle)}
      >
        {supportedQtyToggles.map((qt) => (
          <option key={qt} value={qt} className="table-inner-cell">
            {qtyToggleToShortStr(qt)}
          </option>
        ))}
      </select>
    </div>
  );
}
