"use client";

import { Select } from "./select";

/**
 * An invisible, single-row stand-in that occupies the same height as a selects toolbar.
 *
 * Placed at the top of a column sitting beside a `*View` (which renders a toolbar above its
 * content), it pushes the column's content down by exactly the toolbar's height — so the two line
 * up regardless of how tall the toolbar actually renders, with no hardcoded offset.
 */
export function ToolbarSpacer() {
  return (
    <div aria-hidden className="invisible flex items-center">
      <Select value={0} onChange={() => undefined} options={[{ value: 0, label: " " }]} />
    </div>
  );
}
