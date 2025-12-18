import { QtyToggle } from "./key-selection";

import {
  composition_value_as_quantity as comp_val_as_qty,
  composition_value_as_percentage as comp_val_as_percent,
} from "@workspace/sci-cream";

export function formatCompositionValue(
  comp: number,
  ingQty: number | undefined,
  mixTotal: number | undefined,
  qtyToggle: QtyToggle,
  isQty: boolean
) {
  const fmtF = (num: number) => {
    return Number.isNaN(num)
      ? "-"
      : num >= 1000
      ? Number((num / 1000).toFixed(1)) + "k"
      : Number(num.toFixed(1));
  };

  if (comp !== 0.0) {
    if (!isQty) {
      return fmtF(comp);
    }

    switch (qtyToggle) {
      case QtyToggle.Composition:
        return fmtF(comp);
      case QtyToggle.Quantity:
        return ingQty ? fmtF(comp_val_as_qty(comp, ingQty)) : "";
      case QtyToggle.Percentage:
        return ingQty && mixTotal ? fmtF(comp_val_as_percent(comp, ingQty, mixTotal)) : "";
    }
  }
}
