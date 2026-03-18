/** Maximum number of supported recipe slots; main recipe and two reference recipes */
export const MAX_RECIPES = 3;
/** Number of ingredient rows per recipe. */
export const RECIPE_TOTAL_ROWS = 20;

/** Icon size (px) used in the navbar. */
export const NAVBAR_ICON_SIZE = 20;
/** Icon size (px) for grid drag handles. */
export const DRAG_HANDLE_ICON_SIZE = 17;
/** Icon size (px) for component action buttons. */
export const COMPONENT_ACTION_ICON_SIZE = 20;
/** Font size (px) for graph titles. */
export const GRAPH_TITLE_FONT_SIZE = 15;

/** Whether the navbar is collapsed by default. */
export const DEFAULT_COLLAPSED_NAVBAR = true;

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
