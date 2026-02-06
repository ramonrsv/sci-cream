"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

function applyTheme(newTheme: Theme) {
  const root = document.documentElement;
  const isDark =
    newTheme === "dark" ||
    (newTheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function isDarkMode(): boolean {
  return typeof window !== "undefined" && document.documentElement.classList.contains("dark");
}

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);

  const [theme, setTheme] = useState<Theme>(() => {
    return typeof window !== "undefined"
      ? (localStorage.getItem("theme") as Theme) || "system"
      : "system";
  });

  useEffect(() => {
    // Intentional for SSR hydration mismatch prevention, this pattern is even in their docs:
    // https://nextjs.org/docs/messages/react-hydration-error#solution-1-using-useeffect-to-run-on-the-client-only
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      applyTheme("system");
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const cycleTheme = () => {
    const nextTheme = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    applyTheme(nextTheme);
  };

  const getIcon = () => {
    switch (theme) {
      case "light":
        return "☀️";
      case "dark":
        return "🌙";
      case "system":
        return "💻";
    }
  };

  const getLabel = () => {
    switch (theme) {
      case "light":
        return "Light";
      case "dark":
        return "Dark";
      case "system":
        return "System";
    }
  };

  // Prevent hydration mismatch
  if (!mounted) return <div />;

  return (
    <button
      onClick={cycleTheme}
      className="button w-25 px-3.5 py-2"
      title={`Current theme: ${getLabel()}. Click to cycle.`}
    >
      <span className="text-base">{getIcon()}</span>
      <span className="font-medium">{getLabel()}</span>
    </button>
  );
}
