"use client";

import { type ReactNode } from "react";

/** A single option for {@link Select}: its value and display label. */
export interface SelectOption<T> {
  /** The value passed to `onChange` when this option is chosen. */
  value: T;
  /** Content shown for this option (a native `<option>`, so effectively text). */
  label: ReactNode;
}

/** Props for the generic {@link Select} dropdown. */
export interface SelectProps<T> {
  /** The currently selected value. */
  value: T;
  /** Called with the new value when the user picks an option. */
  onChange: (value: T) => void;
  /** The selectable options, in display order. */
  options: SelectOption<T>[];
  /** Accessible name for the control, when there is no visible label nearby. */
  ariaLabel?: string;
  /** Hover tooltip naming the control; by convention it also echoes the current value. */
  title?: string;
  /** Decorative mark inside the box saying what the control is for; `ariaLabel` names it. */
  icon?: ReactNode;
  /** Additional classes merged onto the outermost element, e.g. to fix its width. */
  className?: string;
}

/**
 * A generic single-select dropdown rendered as a native `<select>`.
 *
 * Each `<option>` is keyed on its index and mapped back on change, so `T` need not be a string.
 * Backs the toolbar selects and recipe-search/detail-panel pickers; `ThemeSelect` doesn't use this.
 *
 * With an `icon`, a wrapper draws the box around the mark and a bare `<select>`, keeping the mark
 * on the control: `<option>`s hold only text, so prefixing labels repeats it down the open list.
 *
 * Which selects get a mark: those sitting among peer selects, where overlapping option words
 * (`Auto`, `Target`, `Range`) leave a resting toolbar unreadable. A standalone picker named by an
 * adjacent button or label takes `ariaLabel` and `title` only — a mark there says nothing the
 * neighbour doesn't, and a borrowed one implies the two controls do the same thing.
 */
export function Select<T>({
  value,
  onChange,
  options,
  ariaLabel,
  title,
  icon,
  className = "",
}: SelectProps<T>) {
  const selectedIndex = options.findIndex((opt) => opt.value === value);

  // Preflight zeroes borders, so the bare `<select>` needs no reset; `.boxed-input` draws the box.
  // The bare select still inherits its background: the native dropdown paints options in it, and
  // a transparent one leaves them on the UA's light default, unreadable under a dark theme.
  const selectClass = icon
    ? "min-w-0 cursor-pointer bg-inherit text-sm"
    : `boxed-input cursor-pointer text-sm ${className}`;

  const select = (
    <select
      className={selectClass}
      aria-label={ariaLabel}
      title={icon ? undefined : title}
      value={selectedIndex}
      onChange={(e) => onChange(options[Number(e.target.value)].value)}
    >
      {options.map((option, index) => (
        <option key={String(option.value)} value={index}>
          {option.label}
        </option>
      ))}
    </select>
  );

  if (!icon) return select;

  return (
    <span className={`boxed-input inline-flex items-center pl-1 ${className}`} title={title}>
      <span aria-hidden className="text-secondary flex shrink-0">
        {icon}
      </span>
      {select}
    </span>
  );
}
