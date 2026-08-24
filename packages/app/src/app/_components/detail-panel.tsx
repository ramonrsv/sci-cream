"use client";

import { ReactNode, useState } from "react";
import { Pencil, Trash } from "lucide-react";

import { EntitySource } from "@/app/_components/entity-search";
import { MarkdownField } from "@/app/_elements/markdown";
import { Popover, PopoverButton, PopupPanel } from "@/app/_elements/popup";
import { Select, type SelectOption } from "@/app/_elements/selects/select";
import { leafKey, usePersistedState } from "@/lib/hooks/use-persisted-state";
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
          title={`Target slot (${slotLabel?.(targetSlot) ?? targetSlot})`}
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
  testId,
}: {
  onDelete: () => void | Promise<void>;
  confirmText: string;
  label?: string;
  iconSize?: number;
  testId?: string;
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
      data-testid={testId}
    >
      <Trash size={iconSize} />
    </button>
  );
}

/**
 * Per-comments editor: a {@link MarkdownField} (Write/Preview tabs) seeded from `initialValue`,
 * plus a Save button. State is component-owned by design; parents remount it via a `key` tied to
 * the active entry/version to reseed the field when the underlying record changes.
 */
export function EditableComments({
  initialValue,
  onSave,
  ariaLabel = "Comments",
  placeholder = "Add comments…",
  textareaClassName = "min-h-20",
  persistKey,
}: {
  initialValue: string;
  onSave: (value: string) => void | Promise<void>;
  ariaLabel?: string;
  placeholder?: string;
  /** Extra classes merged onto the textarea; callers use this to tune its height. */
  textareaClassName?: string;
  /** Persistence root for the field's Write/Preview tab; see {@link MarkdownField}. */
  persistKey?: string;
}) {
  const [edited, setEdited] = useState<string>(initialValue);
  return (
    <div className="flex flex-col gap-2">
      <MarkdownField
        value={edited}
        onChange={setEdited}
        ariaLabel={ariaLabel}
        placeholder={placeholder}
        textareaClassName={textareaClassName}
        persistKey={persistKey}
      />
      <button onClick={() => onSave(edited)} className="action-button self-end px-2 py-0.5 text-sm">
        Save comments
      </button>
    </div>
  );
}

/**
 * Popup form for a version's name and label; reseeds fresh on every open, no `key` needed.
 * Save is disabled while `validateName` flags the name, or nothing has changed.
 */
function EditVersionDetailsForm({
  initialName,
  initialLabel,
  namePlaceholder,
  validateName,
  onSave,
  close,
}: {
  initialName: string;
  initialLabel: string;
  namePlaceholder?: string;
  validateName?: (value: string) => string | undefined;
  onSave: (details: { name: string; label: string }) => void | Promise<void>;
  close: () => void;
}) {
  const [name, setName] = useState<string>(initialName);
  const [label, setLabel] = useState<string>(initialLabel);

  const nameError = validateName?.(name);
  const unchanged = name.trim() === initialName.trim() && label.trim() === initialLabel.trim();

  const handleSave = async () => {
    await onSave({ name, label });
    close();
  };

  return (
    <div className="flex w-64 flex-col gap-0 p-3">
      <span className="text-primary mb-2 text-sm font-semibold">Version details</span>
      <div className="flex items-center gap-1.5">
        <span className="text-secondary text-xs">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={namePlaceholder}
          aria-label="Version name"
          aria-invalid={nameError !== undefined}
          title={nameError}
          className={`boxed-input w-11 py-0.5 text-center text-sm ${
            nameError ? "outline-2 -outline-offset-2 outline-red-400 outline-solid" : ""
          }`}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-secondary text-xs">Label</span>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. first cut"
          aria-label="Version label"
          className="boxed-input min-w-0 flex-1 py-0.5 text-sm"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={nameError !== undefined || unchanged}
        title={nameError}
        className="action-button self-end px-2 py-0.5 text-sm"
      >
        Save details
      </button>
    </div>
  );
}

/** Edit-version-details action: a button opening a popup to rename/relabel the current version. */
export function EditVersionDetailsAction({
  initialName,
  initialLabel,
  namePlaceholder,
  validateName,
  onSave,
  iconSize = DETAIL_PANEL_ACTION_ICON_SIZE,
}: {
  initialName: string;
  initialLabel: string;
  namePlaceholder?: string;
  validateName?: (value: string) => string | undefined;
  onSave: (details: { name: string; label: string }) => void | Promise<void>;
  iconSize?: number;
}) {
  return (
    <Popover className="flex">
      <PopoverButton
        className="action-button px-2 py-0.5 text-sm"
        title="Edit version name and label"
        aria-label="Edit version details"
      >
        <Pencil size={iconSize} />
      </PopoverButton>
      <PopupPanel>
        {({ close }) => (
          <EditVersionDetailsForm
            initialName={initialName}
            initialLabel={initialLabel}
            namePlaceholder={namePlaceholder}
            validateName={validateName}
            onSave={onSave}
            close={close}
          />
        )}
      </PopupPanel>
    </Popover>
  );
}
