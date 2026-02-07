"use client";

import { useEffect, useState } from "react";
import { Sun, MoonStar, Monitor } from "lucide-react";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";

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
  const [, setTheme] = themeState;
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(getThemeConfigOrDefault());

  useEffect(() => {
    // Intentional for SSR hydration mismatch prevention, this pattern is even in their docs:
    // https://nextjs.org/docs/messages/react-hydration-error#solution-1-using-useeffect-to-run-on-the-client-only
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

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

  return (
    <Listbox value={themeConfig} onChange={applyThemeConfig}>
      <div className="relative">
        <ListboxButton className="button flex items-center gap-2 rounded-full! px-3.5 py-2">
          <selectedOption.icon className="h-5 w-5" />
        </ListboxButton>
        <ListboxOptions className="border-brd-str-lt bg-surface-lt dark:border-brd-str-dk dark:bg-surface-dk absolute right-0 z-50 mt-1 w-32 rounded-md border py-1 shadow-lg">
          {themeOptions.map((option) => (
            <ListboxOption
              key={option.value}
              value={option.value}
              className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-100 data-selected:bg-blue-100 dark:hover:bg-gray-700 dark:data-selected:bg-blue-900"
            >
              <option.icon className="h-4 w-4" />
              <span>{option.label}</span>
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
