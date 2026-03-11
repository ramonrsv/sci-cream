"use client";

import { useEffect, useState } from "react";
import { Sun, MoonStar, Monitor } from "lucide-react";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";

import { NAVBAR_ICON_SIZE } from "@/lib/ui/constants";

export enum Theme {
  Light = "Light",
  Dark = "Dark",
}

enum ThemeConfig {
  Light = "Light",
  Dark = "Dark",
  System = "System",
}

function resolveThemeFromConfig(themeConfig: ThemeConfig): Theme {
  return themeConfig === ThemeConfig.System && typeof window !== "undefined"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
      ? Theme.Dark
      : Theme.Light
    : themeConfig === ThemeConfig.Dark
      ? Theme.Dark
      : Theme.Light;
}

function applyTheme(newTheme: Theme) {
  const root = document.documentElement;

  if (newTheme === Theme.Dark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function isDarkMode(): boolean {
  return typeof window !== "undefined" && document.documentElement.classList.contains("dark");
}

function getThemeConfigOrDefault(): ThemeConfig {
  return typeof window !== "undefined"
    ? (localStorage.getItem("theme") as ThemeConfig) || ThemeConfig.System
    : ThemeConfig.System;
}

export function getInitialTheme(): Theme {
  const config = getThemeConfigOrDefault();
  return resolveThemeFromConfig(config);
}

const themeOptions = [
  { value: ThemeConfig.Light, label: "Light", icon: Sun },
  { value: ThemeConfig.Dark, label: "Dark", icon: MoonStar },
  { value: ThemeConfig.System, label: "System", icon: Monitor },
];

export function ThemeSelect({
  themeState,
}: {
  themeState: [Theme, React.Dispatch<React.SetStateAction<Theme>>];
}) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = themeState;
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(getThemeConfigOrDefault());

  useEffect(() => {
    // Intentional for SSR hydration mismatch prevention, this pattern is in their docs:
    // https://nextjs.org/docs/messages/react-hydration-error#solution-1-using-useeffect-to-run-on-the-client-only
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  // Apply the initial theme on mount
  useEffect(() => applyTheme(theme), []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyThemeConfig = (config: ThemeConfig) => {
    setThemeConfig(config);
    localStorage.setItem("theme", config);

    const resolvedTheme = resolveThemeFromConfig(config);
    setTheme(resolvedTheme);
    applyTheme(resolvedTheme);
  };

  // Prevent hydration mismatch
  if (!mounted) return <div />;

  const selectedOption = themeOptions.find((opt) => opt.value === themeConfig) ?? themeOptions[2];

  const iconSize = NAVBAR_ICON_SIZE;

  return (
    <Listbox value={themeConfig} onChange={applyThemeConfig}>
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
