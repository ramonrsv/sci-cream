import { devices } from "@playwright/test";

/** Represents a viewport configuration for visual regression tests. */
interface ViewportAsset {
  name: string;
  viewport: { width: number; height: number };
  screenshot: string;
}

/** Mobile viewport in vertical orientation (e.g. Pixel 5) */
export const VIEWPORT_MOBILE_VERTICAL: ViewportAsset = {
  name: "mobile viewport - horizontal layout",
  viewport: devices["Pixel 5"].viewport,
  screenshot: "mobile-vertical",
};

/** Mobile viewport in horizontal orientation (e.g. Pixel 5) */
export const VIEWPORT_MOBILE_HORIZONTAL: ViewportAsset = {
  name: "mobile viewport - vertical layout",
  viewport: {
    width: devices["Pixel 5"].viewport.height,
    height: devices["Pixel 5"].viewport.width,
  },
  screenshot: "mobile-horizontal",
};

/** Tablet viewport in vertical orientation (e.g. iPad Pro 11) */
export const VIEWPORT_TABLET_VERTICAL: ViewportAsset = {
  name: "tablet viewport - vertical layout",
  viewport: devices["iPad Pro 11"].viewport,
  screenshot: "tablet-vertical",
};

/** Tablet viewport in horizontal orientation (e.g. iPad Pro 11) */
export const VIEWPORT_TABLET_HORIZONTAL: ViewportAsset = {
  name: "tablet viewport - horizontal layout",
  viewport: {
    width: devices["iPad Pro 11"].viewport.height,
    height: devices["iPad Pro 11"].viewport.width,
  },
  screenshot: "tablet-horizontal",
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
  VIEWPORT_MOBILE_VERTICAL,
  VIEWPORT_MOBILE_HORIZONTAL,
  VIEWPORT_TABLET_VERTICAL,
  VIEWPORT_TABLET_HORIZONTAL,
  VIEWPORT_DESKTOP_1080P_HALF,
  VIEWPORT_DESKTOP_1080P_FULL,
  VIEWPORT_DESKTOP_1440P_HALF,
  VIEWPORT_DESKTOP_1440P_FULL,
  VIEWPORT_DESKTOP_2160P_HALF,
  VIEWPORT_DESKTOP_2160P_FULL,
];
