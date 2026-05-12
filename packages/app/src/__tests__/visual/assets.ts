import { devices } from "@playwright/test";

/** Represents a viewport configuration for visual regression tests. */
interface ViewportAsset {
  name: string;
  viewport: { width: number; height: number };
  screenshot: string;
}

/** Mobile viewport in portrait orientation (e.g. Pixel 5) */
export const VIEWPORT_MOBILE_PORTRAIT: ViewportAsset = {
  name: "mobile viewport - portrait layout",
  viewport: devices["Pixel 5"].viewport,
  screenshot: "mobile-portrait",
};

/** Mobile viewport in landscape orientation (e.g. Pixel 5) */
export const VIEWPORT_MOBILE_LANDSCAPE: ViewportAsset = {
  name: "mobile viewport - landscape layout",
  viewport: devices["Pixel 5 landscape"].viewport,
  screenshot: "mobile-landscape",
};

/** Tablet viewport in portrait orientation (e.g. iPad Pro 11) */
export const VIEWPORT_TABLET_PORTRAIT: ViewportAsset = {
  name: "tablet viewport - portrait layout",
  viewport: devices["iPad Pro 11"].viewport,
  screenshot: "tablet-portrait",
};

/** Tablet viewport in landscape orientation (e.g. iPad Pro 11) */
export const VIEWPORT_TABLET_LANDSCAPE: ViewportAsset = {
  name: "tablet viewport - landscape layout",
  viewport: devices["iPad Pro 11 landscape"].viewport,
  screenshot: "tablet-landscape",
};

/**
 * Desktop viewport - default size from Playwright's built-in devices
 *
 * This is a 1080p screen, but a much smaller viewport (1280x720), ostensibly to simulate a "typical
 * browser window with toolbars, tabs, and address bar included", although it seems too much to me.
 *
 * @see https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/deviceDescriptorsSource.json
 */
export const VIEWPORT_DESKTOP_DEFAULT: ViewportAsset = {
  name: "desktop viewport - default",
  viewport: devices["Desktop Chrome"].viewport,
  screenshot: "desktop-default",
};

/** Estimated vertical space taken by browser UI (address bar, tabs, etc.) on desktop viewports */
export const BROWSER_VERTICAL_OFFSET = 170;

/** Estimated horizontal space taken by browser UI (scrollbars, borders, etc.) desktop viewports */
export const BROWSER_HORIZONTAL_OFFSET = 2;

/** Adjusts a desktop viewport to account for estimated browser UI space */
export function adjustDesktopViewportForBrowserUI(viewport: { width: number; height: number }) {
  return {
    width: viewport.width - BROWSER_HORIZONTAL_OFFSET,
    height: viewport.height - BROWSER_VERTICAL_OFFSET,
  };
}

/** Desktop viewport - 1080p, half screen */
export const VIEWPORT_DESKTOP_1080P_HALF: ViewportAsset = {
  name: "desktop viewport - 1080p, half screen",
  viewport: adjustDesktopViewportForBrowserUI({ width: 960, height: 1080 }),
  screenshot: "desktop-1080p-half",
};

/** Desktop viewport - 1080p, full screen */
export const VIEWPORT_DESKTOP_1080P_FULL: ViewportAsset = {
  name: "desktop viewport - 1080p, full screen",
  viewport: adjustDesktopViewportForBrowserUI({ width: 1920, height: 1080 }),
  screenshot: "desktop-1080p-full",
};

/** Desktop viewport - 1440p, half screen; doubles as 2160p with 150% scaling */
export const VIEWPORT_DESKTOP_1440P_HALF: ViewportAsset = {
  name: "desktop viewport - 1440p, half screen",
  viewport: adjustDesktopViewportForBrowserUI({ width: 1280, height: 1440 }),
  screenshot: "desktop-1440p-half",
};

/** Desktop viewport - 1440p, full screen; doubles as 2160p with 150% scaling*/
export const VIEWPORT_DESKTOP_1440P_FULL: ViewportAsset = {
  name: "desktop viewport - 1440p, full screen",
  viewport: adjustDesktopViewportForBrowserUI({ width: 2560, height: 1440 }),
  screenshot: "desktop-1440p-full",
};

/** Common viewports for visual regression tests, derived from Playwright's built-in devices. */
export const VIEWPORTS: ViewportAsset[] = [
  VIEWPORT_MOBILE_PORTRAIT,
  VIEWPORT_MOBILE_LANDSCAPE,
  VIEWPORT_TABLET_PORTRAIT,
  VIEWPORT_TABLET_LANDSCAPE,
  VIEWPORT_DESKTOP_DEFAULT,
  VIEWPORT_DESKTOP_1080P_HALF,
  VIEWPORT_DESKTOP_1080P_FULL,
  VIEWPORT_DESKTOP_1440P_HALF,
  VIEWPORT_DESKTOP_1440P_FULL,
];
