/** Maximum number of supported recipe slots; main recipe and two reference recipes */
export const MAX_RECIPES = 3;
/** Number of ingredient rows per recipe. */
export const RECIPE_TOTAL_ROWS = 20;

/** Icon size (px) for grid drag handles. */
export const DRAG_HANDLE_ICON_SIZE = 17;
/** Icon size (px) for component action buttons. */
export const COMPONENT_ACTION_ICON_SIZE = 20;
/** Icon size (px) for action buttons inside an entity-search detail panel. */
export const DETAIL_PANEL_ACTION_ICON_SIZE = 14;

/** Icon size (px) used in the header. */
export const HEADER_ICON_SIZE = 20;
/** Icon size (px) used in the navbar. */
export const NAVBAR_ICON_SIZE = 20;

/** Whether the navbar is collapsed by default. */
export const DEFAULT_COLLAPSED_NAVBAR = true;
/** Collapsed sidebar width: hidden on mobile, rail on desktop. */
export const SIDEBAR_W_COLLAPSED = "w-0 sm:w-18";
/** In-flow gutter when collapsed: a mobile left inset; drawer stays w-0, rail on desktop. */
export const SIDEBAR_W_COLLAPSED_SPACER = "w-4 sm:w-18";
/** Collapsed header-left width: keeps the logo tappable on mobile, rail on desktop. */
export const HEADER_W_COLLAPSED = "w-14 sm:w-18";
/** Pinned width (`collapsed = false`): rail on mobile, expanded on desktop. */
export const SIDEBAR_W_PINNED = "w-14 sm:w-58";
/** Full drawer width: the peek overlay (both sections, both breakpoints). */
export const SIDEBAR_W_EXPANDED = "w-54 sm:w-58";

// ----  Fixed sizes for react-grid-layout components ----------------------------------------------

// These values are carefully chosen so that the fixed height components (RecipeGrid, IngCompGrid)
// and the grid container heights match exactly, so that there is enough margin after the components
// to accommodate a possible scrollbar, and so that REACT_GRID_COMPONENT_HEIGHT is a whole unit so
// that we can resize components back to their original size (resize is only allowed in whole units)
//
// @todo REACT_GRID_COMPONENT_HEIGHT * REACT_GRID_ROW_HEIGHT != STD_COMPONENT_H_PX; I don't
// understand what's going on here, but I'm sick of trying to get react-grid-layout to behave, so
// leaving it like this for now; it seems to work well, at least on Chrome and on a 1440p display.

/** Height of a grid component in react-grid-layout units. */
export const REACT_GRID_COMPONENT_HEIGHT = 11;
/** Pixel height of a single react-grid-layout row unit. */
export const REACT_GRID_ROW_HEIGHT = 36;
/** Standard fixed height (px) for full-height grid components such as `RecipeGrid` */
export const STD_COMPONENT_H_PX = 596;

// ----  Shared chart chrome (tooltip + layout) ----------------------------------------------------

/** Tooltip corner radius (px). */
export const TOOLTIP_CORNER_RADIUS = 8;
/** Tooltip inner padding (px). */
export const TOOLTIP_PADDING = 10;
/** Tooltip border width (px). */
export const TOOLTIP_BORDER_WIDTH = 1;
/** Monospace font family for tooltip body text, so numeric columns align. */
export const TOOLTIP_BODY_FONT = "ui-monospace, SFMono-Regular, Menlo, monospace";
