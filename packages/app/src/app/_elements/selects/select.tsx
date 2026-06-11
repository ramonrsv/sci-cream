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
}

/**
 * A generic single-select dropdown rendered as a native `<select>`.
 *
 * Each `<option>` is keyed on its index and mapped back on change, so `T` need not be a string.
 * Backs the toolbar selects and recipe-search/detail-panel pickers; `ThemeSelect` doesn't use this.
 */
export function Select<T>({ value, onChange, options, ariaLabel }: SelectProps<T>) {
  const selectedIndex = options.findIndex((opt) => opt.value === value);

  return (
    <select
      className="boxed-input cursor-pointer text-sm"
      aria-label={ariaLabel}
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
}
