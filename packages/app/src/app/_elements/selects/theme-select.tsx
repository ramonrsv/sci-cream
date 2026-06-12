"use client";

import { useTheme } from "next-themes";

import { Sun, MoonStar, Monitor } from "lucide-react";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";

import { NAVBAR_ICON_SIZE } from "@/lib/styles/sizes";

/** Available theme options with their display label and icon */
const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: MoonStar },
  { value: "system", label: "System", icon: Monitor },
];

/**
 * Dropdown button in the navbar for switching between light, dark, and system themes.
 *
 * Unlike the toolbar selects, this is an icon-only navbar control, so it keeps its own bespoke
 * `Listbox` rather than using the shared {@link Select}. It still follows the same Headless UI
 * structure (listbox button + options), so the shared test helpers locate it the same way.
 */
export function ThemeSelect() {
  const { theme, setTheme } = useTheme();

  const selectedOption = themeOptions.find((opt) => opt.value === theme) ?? themeOptions[2];

  const iconSize = NAVBAR_ICON_SIZE;

  return (
    <div id="theme-select">
      <Listbox value={theme} onChange={setTheme}>
        <ListboxButton className="header-button flex items-center">
          <selectedOption.icon size={iconSize} />
        </ListboxButton>
        <ListboxOptions anchor="bottom start" className="popup z-50 w-23">
          {themeOptions.map((option) => (
            <ListboxOption key={option.value} value={option.value} className="select-option">
              <option.icon size={iconSize} />
              <span>{option.label}</span>
            </ListboxOption>
          ))}
        </ListboxOptions>
      </Listbox>
    </div>
  );
}
