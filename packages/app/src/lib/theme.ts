import { useTheme as useThemeFromNextThemes } from "next-themes";

/** Application-level theme enum, mapped from the `next-themes` resolved theme string */
export enum Theme {
  Light = "Light",
  Dark = "Dark",
}

/** Convert a `next-themes` resolved theme string to the app `Theme` enum; defaults to `Light` */
export function resolvedNextThemeToAppTheme(resolvedNextTheme: string | undefined): Theme {
  if (resolvedNextTheme === "light") return Theme.Light;
  if (resolvedNextTheme === "dark") return Theme.Dark;
  if (resolvedNextTheme === undefined) return Theme.Light; // Default to light theme
  throw new Error(`Unexpected resolved theme from next-themes: ${resolvedNextTheme}`);
}

/** Convert an app `Theme` enum value to the `next-themes` theme string */
export function appThemeToNextTheme(appTheme: Theme): string {
  if (appTheme === Theme.Light) return "light";
  if (appTheme === Theme.Dark) return "dark";
  throw new Error(`Unexpected app theme: ${appTheme}`);
}

/** Hook that returns the current app `Theme`, resolved from `next-themes` */
export function useTheme() {
  const { resolvedTheme } = useThemeFromNextThemes();
  return { theme: resolvedNextThemeToAppTheme(resolvedTheme) };
}

/** Returns `true` when the document root has the `dark` class applied; always `false` on server */
export function isDarkMode(): boolean {
  return typeof window !== "undefined" && document.documentElement.classList.contains("dark");
}
