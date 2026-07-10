import { useEffect, useReducer } from "react";
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

/**
 * Force the caller to re-render whenever the document root's class list changes.
 *
 * Canvas charts read cascaded CSS colors with {@link getColor} during render, so they must
 * re-render to repaint after a theme flip. A `next-themes` `resolvedTheme` subscription fires too
 * early: it applies the `.dark` class in a post-commit effect, so the re-render reads stale colors.
 * Observing the class mutation re-renders after it lands (and covers OS-level system changes).
 */
export function useThemeRepaint(): void {
  const [, forceRender] = useReducer((tick: number) => tick + 1, 0);
  useEffect(() => {
    const observer = new MutationObserver(() => forceRender());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
}

/** Returns `true` when the document root has the `dark` class applied; always `false` on server */
export function isDarkMode(): boolean {
  return typeof window !== "undefined" && document.documentElement.classList.contains("dark");
}
