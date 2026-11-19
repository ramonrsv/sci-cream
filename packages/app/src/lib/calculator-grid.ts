import type { LayoutItem, ResizeHandleAxis, ResponsiveLayouts } from "react-grid-layout";

import { REACT_GRID_COMPONENT_HEIGHT } from "@/lib/styles/sizes";

// 2160p: 3840px, /2 = 1920px
// 1440p: 2560px, /2 = 1280px
// 1080p: 1920px, /2 =  960px

/** Pixel-width breakpoints for the responsive grid layout */
export const GRID_BREAKPOINTS = { xl: 2080, lg: 1600, md: 1120, sm: 720, xs: 0 };

/** Number of grid columns at each breakpoint */
export const GRID_COLS = { xl: 32, lg: 24, md: 16, sm: 12, xs: 8 };

/** Default layout of the calculator's panels at each breakpoint */
export const DEFAULT_GRID_LAYOUTS: ResponsiveLayouts = makeDefaultLayouts();

/** Build {@link DEFAULT_GRID_LAYOUTS} from a base item per panel and per-breakpoint overrides */
function makeDefaultLayouts(): ResponsiveLayouts {
  const h = REACT_GRID_COMPONENT_HEIGHT;
  const fullW = (bp: keyof typeof GRID_COLS) => GRID_COLS[bp];

  const horizVert = ["e", "w", "s"] as ResizeHandleAxis[];

  /** Base layout item configuration shared across all breakpoint layouts */
  // prettier-ignore
  const base = {
    "recipe":      { i: "recipe",      h, resizeHandles: horizVert, minW: 5 },
    "watchers":    { i: "watchers",    h, resizeHandles: horizVert, minW: 4 },
    "props-chart": { i: "props-chart", h, resizeHandles: horizVert },
    "properties":  { i: "properties",  h, resizeHandles: horizVert, minW: 4 },
    "fpd-graph":   { i: "fpd-graph",   h, resizeHandles: horizVert },
    "composition": { i: "composition", h, resizeHandles: horizVert, minW: 5 },
  };

  /** Merge override properties into a base layout item, producing a fully-typed `LayoutItem` */
  const update = (i: keyof typeof base, updates: Partial<LayoutItem>): LayoutItem => {
    return { ...base[i], ...updates } as LayoutItem;
  };

  // prettier-ignore
  const xlLayout: LayoutItem[] = [
    update("recipe",      { x:  0, y:     0, w:   7 }),
    update("watchers",    { x:  7, y:     0, w:  12 }),
    update("props-chart", { x: 19, y:     0, w:  13 }),
    update("properties",  { x:  0, y:     h, w:   7 }),
    update("fpd-graph",   { x:  7, y:     h, w:  10 }),
    update("composition", { x: 17, y:     h, w:  15 }),
  ];

  // prettier-ignore
  const lgLayout: LayoutItem[] = [
    update("recipe",      { x:  0, y:     0, w:   7 }),
    update("watchers",    { x:  7, y:     0, w:  17, h: 7}),
    update("props-chart", { x:  7, y:     7, w:  17, h: 7 }),
    update("properties",  { x:  0, y:     h, w:   7 }),
    update("fpd-graph",   { x:  7, y:    14, w:   9, h: 8 }),
    update("composition", { x: 16, y:    14, w:   8 }),
  ];

  // prettier-ignore
  const mdLayout: LayoutItem[] = [
    update("recipe",      { x:  0, y:     0, w:   6 }),
    update("watchers",    { x:  6, y:     0, w:  10, h: 7}),
    update("props-chart", { x:  6, y:     7, w:  10, h: 7 }),
    update("properties",  { x:  0, y:     h, w:   6 }),
    update("fpd-graph",   { x:  6, y:    14, w:  10, h: 8 }),
    update("composition", { x:  0, y: h * 2, w:  fullW("md") }),
  ];

  // prettier-ignore
  const smLayout: LayoutItem[] = [
    update("recipe",      { x:  0, y:     0, w:  5 }),
    update("watchers",    { x:  5, y:     0, w:  7 }),
    update("properties",  { x:  0, y:     h, w:  4 }),
    update("props-chart", { x:  4, y:     h, w:  8 }),
    update("fpd-graph",   { x:  0, y: h * 2, w:  6 }),
    update("composition", { x:  6, y: h * 2, w:  6 }),
  ];

  // prettier-ignore
  const xsLayout: LayoutItem[] = [
    update("recipe",      { x:  0, y:     0, w:  fullW("xs") }),
    update("watchers",    { x:  0, y:     h, w:  fullW("xs") }),
    update("props-chart", { x:  0, y: h * 2, w:  fullW("xs") }),
    update("properties",  { x:  0, y: h * 3, w:  fullW("xs") }),
    update("fpd-graph",   { x:  0, y: h * 4, w:  fullW("xs"), h: h - 1 }),
    update("composition", { x:  0, y: h * 5 - 1, w: fullW("xs") }),
  ];

  return { xl: xlLayout, lg: lgLayout, md: mdLayout, sm: smLayout, xs: xsLayout };
}
