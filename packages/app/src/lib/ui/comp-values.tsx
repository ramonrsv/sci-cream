import { QtyToggle } from "./key-selection";

import {
  composition_value_as_quantity as comp_val_as_qty,
  composition_value_as_percentage as comp_val_as_percent,
} from "@workspace/sci-cream";

export function padToFixedDecimalPosition(
  num: number,
  decimals: number,
  left_pad_digits: number,
  right_pad_digits: number
) {
  const parts = Number(num.toFixed(decimals)).toString().split(".");
  parts[0] = parts[0].padStart(left_pad_digits, " ");
  if (parts.length === 1) {
    return parts[0] + " ".repeat(right_pad_digits + 1);
  } else {
    parts[1] = parts[1].padEnd(right_pad_digits, " ");
    return parts.join(".");
  }
}

export function formatCompositionValue(num: number | undefined) {
  return num === undefined
    ? ""
    : Number.isNaN(num)
    ? "-"
    : num >= 1000
    ? padToFixedDecimalPosition(num / 1000, 1, 3, 1) + "k"
    : num < 10
    ? padToFixedDecimalPosition(num, 2, 3, 2)
    : padToFixedDecimalPosition(num, 1, 3, 2);
}

export function applyQtyToggle(
  comp: number,
  ingQty: number | undefined,
  mixTotal: number | undefined,
  qtyToggle: QtyToggle,
  isQty: boolean
): number | undefined {
  if (comp !== 0.0) {
    if (!isQty) {
      return comp;
    }

    switch (qtyToggle) {
      case QtyToggle.Composition:
        return comp;
      case QtyToggle.Quantity:
        return ingQty ? comp_val_as_qty(comp, ingQty) : undefined;
      case QtyToggle.Percentage:
        return ingQty && mixTotal ? comp_val_as_percent(comp, ingQty, mixTotal) : undefined;
    }
  }
}

export function applyQtyToggleAndFormat(
  comp: number,
  ingQty: number | undefined,
  mixTotal: number | undefined,
  qtyToggle: QtyToggle,
  isQty: boolean
): string {
  return formatCompositionValue(applyQtyToggle(comp, ingQty, mixTotal, qtyToggle, isQty));
}
