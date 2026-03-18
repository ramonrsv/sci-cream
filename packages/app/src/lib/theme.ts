import { useTheme as useThemeFromNextThemes } from "next-themes";

export enum Theme {
  Light = "Light",
  Dark = "Dark",
}

export function resolvedNextThemeToAppTheme(resolvedNextTheme: string | undefined): Theme {
  if (resolvedNextTheme === "light") return Theme.Light;
  if (resolvedNextTheme === "dark") return Theme.Dark;
  if (resolvedNextTheme === undefined) return Theme.Light; // Default to light theme
  throw new Error(`Unexpected resolved theme from next-themes: ${resolvedNextTheme}`);
}

export function appThemeToNextTheme(appTheme: Theme): string {
  if (appTheme === Theme.Light) return "light";
  if (appTheme === Theme.Dark) return "dark";
  throw new Error(`Unexpected app theme: ${appTheme}`);
}

export function useTheme() {
  const { resolvedTheme } = useThemeFromNextThemes();
  return { theme: resolvedNextThemeToAppTheme(resolvedTheme) };
}

export function isDarkMode(): boolean {
  return typeof window !== "undefined" && document.documentElement.classList.contains("dark");
}
