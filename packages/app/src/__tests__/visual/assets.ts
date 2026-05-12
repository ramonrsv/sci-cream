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

/** Desktop viewport - 1080p, half screen */
export const VIEWPORT_DESKTOP_1080P_HALF: ViewportAsset = {
  name: "desktop viewport - 1080p, half screen",
  viewport: { width: 960, height: 1080 },
  screenshot: "desktop-1080p-half",
};

/** Desktop viewport - 1080p, full screen */
export const VIEWPORT_DESKTOP_1080P_FULL: ViewportAsset = {
  name: "desktop viewport - 1080p, full screen",
  viewport: { width: 1920, height: 1080 },
  screenshot: "desktop-1080p-full",
};

/** Desktop viewport - 1440p, half screen */
export const VIEWPORT_DESKTOP_1440P_HALF: ViewportAsset = {
  name: "desktop viewport - 1440p, half screen",
  viewport: { width: 1280, height: 1440 },
  screenshot: "desktop-1440p-half",
};

/** Desktop viewport - 1440p, full screen */
export const VIEWPORT_DESKTOP_1440P_FULL: ViewportAsset = {
  name: "desktop viewport - 1440p, full screen",
  viewport: { width: 2560, height: 1440 },
  screenshot: "desktop-1440p-full",
};

/** Desktop viewport - 2160p (4K UHD), half screen */
export const VIEWPORT_DESKTOP_2160P_HALF: ViewportAsset = {
  name: "desktop viewport - 4K UHD, half screen",
  viewport: { width: 1920, height: 2160 },
  screenshot: "desktop-2160p-half",
};

/** Desktop viewport - 2160p (4K UHD), full screen */
export const VIEWPORT_DESKTOP_2160P_FULL: ViewportAsset = {
  name: "desktop viewport - 4K UHD, full screen",
  viewport: { width: 3840, height: 2160 },
  screenshot: "desktop-2160p-full",
};

/** Common viewports for visual regression tests, derived from Playwright's built-in devices. */
export const VIEWPORTS: ViewportAsset[] = [
  VIEWPORT_MOBILE_PORTRAIT,
  VIEWPORT_MOBILE_LANDSCAPE,
  VIEWPORT_TABLET_PORTRAIT,
  VIEWPORT_TABLET_LANDSCAPE,
  VIEWPORT_DESKTOP_1080P_HALF,
  VIEWPORT_DESKTOP_1080P_FULL,
  VIEWPORT_DESKTOP_1440P_HALF,
  VIEWPORT_DESKTOP_1440P_FULL,
  VIEWPORT_DESKTOP_2160P_HALF,
  VIEWPORT_DESKTOP_2160P_FULL,
];
