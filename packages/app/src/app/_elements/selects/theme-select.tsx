"use client";

import { useTheme } from "next-themes";

import { Sun, MoonStar, Monitor } from "lucide-react";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";

import { NAVBAR_ICON_SIZE } from "@/lib/styles/sizes";

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: MoonStar },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeSelect() {
  const { theme, setTheme } = useTheme();

  const selectedOption = themeOptions.find((opt) => opt.value === theme) ?? themeOptions[2];

  const iconSize = NAVBAR_ICON_SIZE;

  return (
    <Listbox value={theme} onChange={setTheme}>
      <ListboxButton className="header-button flex items-center">
        <selectedOption.icon size={iconSize} />
      </ListboxButton>
      <ListboxOptions anchor="bottom start" className="popup z-50 w-32">
        {themeOptions.map((option) => (
          <ListboxOption
            key={option.value}
            value={option.value}
            className="flex cursor-pointer items-center gap-1 px-2 py-1.5 hover:bg-gray-100 data-selected:bg-blue-100 dark:hover:bg-gray-700 dark:data-selected:bg-blue-900"
          >
            <option.icon size={iconSize} />
            <span>{option.label}</span>
          </ListboxOption>
        ))}
      </ListboxOptions>
    </Listbox>
  );
}
