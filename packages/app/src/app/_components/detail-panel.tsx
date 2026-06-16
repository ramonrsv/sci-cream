"use client";

import { ReactNode, useState } from "react";
import { Trash } from "lucide-react";

import { EntitySource } from "@/app/_components/entity-search";
import { Select, type SelectOption } from "@/app/_elements/selects/select";
import { leafKey, usePersistedState } from "@/lib/use-persisted-state";
import { isValidSlotStore } from "@/app/_elements/selects/recipe-select";
import { DETAIL_PANEL_ACTION_ICON_SIZE } from "@/lib/styles/sizes";

/**
 * Header row for a detail panel: title and source badge on the left, optional `meta` badges next
 * to the source tag, and `children` rendered as right-aligned action buttons.
 *
 * Used by consumers of {@link EntitySearch}'s `renderDetailPanel` to keep a consistent header
 * shape across different entity types without forcing the shell to know about per-entity actions.
 */
export function DetailPanelHeader({
  title,
  source,
  meta,
  children,
}: {
  title: string;
  source: EntitySource.Embedded | EntitySource.Saved;
  meta?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-primary text-base font-semibold">{title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {meta}
          <span className="meta-tag">
            {source === EntitySource.Embedded ? "built-in" : "saved"}
          </span>
        </div>
      </div>
      {children && <div className="flex shrink-0 items-center gap-1">{children}</div>}
    </div>
  );
}

/**
 * Slot picker + load button. The picker is rendered only when `slots` has more than one entry;
 * with a single slot (or none), only the load button is shown. The internally-managed selection
 * defaults to the first slot.
 */
export function LoadAction({
  onLoad,
  slots,
  slotLabel,
  label = "Load",
  persistKey,
}: {
  onLoad: (slot: number) => void;
  slots?: number[];
  slotLabel?: (slot: number) => string;
  label?: string;
  persistKey?: string;
}) {
  const [targetSlot, setTargetSlot] = usePersistedState<number>(
    leafKey(persistKey, "slot"),
    slots?.[0] ?? 0,
    { isValid: isValidSlotStore },
  );

  const slotOptions: SelectOption<number>[] = (slots ?? []).map((slot) => ({
    value: slot,
    label: slotLabel?.(slot) ?? slot,
  }));

  return (
    <>
      {slots && slots.length > 1 && (
        <Select
          value={targetSlot}
          onChange={setTargetSlot}
          options={slotOptions}
          ariaLabel="Target slot"
        />
      )}
      <button onClick={() => onLoad(targetSlot)} className="action-button px-2 py-0.5 text-sm">
        {label}
      </button>
    </>
  );
}

/** Trash-icon delete button with a `window.confirm` prompt, gated on the user's confirmation */
export function DeleteAction({
  onDelete,
  confirmText,
  label = "Delete",
  iconSize = DETAIL_PANEL_ACTION_ICON_SIZE,
}: {
  onDelete: () => void | Promise<void>;
  confirmText: string;
  label?: string;
  iconSize?: number;
}) {
  const handleClick = async () => {
    if (!window.confirm(confirmText)) return;
    await onDelete();
  };
  return (
    <button
      onClick={handleClick}
      title={label}
      aria-label={label}
      className="action-button px-2 py-0.5 text-sm"
    >
      <Trash size={iconSize} />
    </button>
  );
}

/**
 * Per-comments editor: textarea seeded from `initialValue` plus a Save button. Internal state is
 * owned by the component, which is intentional — parents typically remount it (via a `key` prop
 * tied to the active entry/version) to reseed the textarea when the underlying record changes.
 */
export function EditableComments({
  initialValue,
  onSave,
  ariaLabel = "Comments",
  placeholder = "Add comments…",
}: {
  initialValue: string;
  onSave: (value: string) => void | Promise<void>;
  ariaLabel?: string;
  placeholder?: string;
}) {
  const [edited, setEdited] = useState<string>(initialValue);
  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={edited}
        onChange={(e) => setEdited(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="table-fillable-input text-secondary min-h-20 rounded-lg px-2 py-1 text-sm leading-relaxed"
      />
      <button onClick={() => onSave(edited)} className="action-button self-end px-2 py-0.5 text-sm">
        Save comments
      </button>
    </div>
  );
}
