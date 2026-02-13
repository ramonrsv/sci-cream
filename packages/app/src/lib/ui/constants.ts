export const MAX_RECIPES = 3;
export const RECIPE_TOTAL_ROWS = 20;

export const DRAG_HANDLE_ICON_SIZE = 17;
export const COMPONENT_ACTION_ICON_SIZE = 20;
export const GRAPH_TITLE_FONT_SIZE = 15;

// These values are carefully chosen so that the fixed height components (RecipeGrid, IngCompGrid)
// and the grid container heights match exactly, so that there is enough margin after the components
// to accommodate a possible scrollbar, and so that REACT_GRID_COMPONENT_HEIGHT is a whole unit so
// that we can resize components back to their original size (resize is only allowed in whole units)
//
// @todo REACT_GRID_COMPONENT_HEIGHT * REACT_GRID_ROW_HEIGHT != STD_COMPONENT_H_PX; I don't
// understand what's going on here, but I'm sick of trying to get react-grid-layout to behave, so
// leaving it like this for now; it seems to work well, at least on Chrome and on a 1440p display.
export const REACT_GRID_COMPONENT_HEIGHT = 11;
export const REACT_GRID_ROW_HEIGHT = 36;
export const STD_COMPONENT_H_PX = 596;
