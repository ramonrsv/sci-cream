"use client";

import { ComponentProps } from "react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";

export { Popover, PopoverButton };

/**
 * Floating panel for a {@link Popover}, styled with the app's `.popup` chrome and positioned via
 * Headless UI's Floating UI integration. The panel renders in a portal and auto-flips/shifts to
 * stay inside the viewport, so a popup near a screen edge never causes page overflow.
 *
 * `anchor` chooses the preferred side and gap/padding (e.g. `{ to: "right start", gap: 5 }`);
 * `padding` is the minimum space kept from the viewport edge. Children may be a render prop
 * receiving `{ close }` to dismiss the popup (Escape and outside-click dismiss it automatically).
 */
export function PopupPanel({
  anchor = { to: "bottom end", gap: 4, padding: 8 },
  className = "",
  children,
  ...props
}: {
  anchor?: ComponentProps<typeof PopoverPanel>["anchor"];
  className?: string;
  children: ComponentProps<typeof PopoverPanel>["children"];
} & Omit<ComponentProps<typeof PopoverPanel>, "anchor" | "className" | "children">) {
  return (
    <PopoverPanel anchor={anchor} className={`popup z-50 ${className}`} {...props}>
      {children}
    </PopoverPanel>
  );
}
