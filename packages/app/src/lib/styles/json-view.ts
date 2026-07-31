import type { ComponentProps } from "react";
import { allExpanded, defaultStyles, JsonView } from "react-json-view-lite";

/** The `style` prop's shape; the library declares `StyleProps` but does not export it. */
type JsonViewStyles = NonNullable<ComponentProps<typeof JsonView>["style"]>;

/**
 * Class map for {@link JsonView}: the library's structure and spacing, with every color and weight
 * overridden by the `json-view-*` rules in `globals.css`. Those overrides make `defaultStyles` and
 * `darkStyles` identical, so the base is fixed and light/dark rides on the app's CSS variables.
 */
export const JSON_VIEW_STYLES: JsonViewStyles = {
  ...defaultStyles,
  container: `${defaultStyles.container} json-view`,
  label: `${defaultStyles.label} json-view-key`,
  clickableLabel: `${defaultStyles.clickableLabel} json-view-key`,
  punctuation: `${defaultStyles.punctuation} json-view-punc`,
  stringValue: `${defaultStyles.stringValue} json-view-str`,
  numberValue: `${defaultStyles.numberValue} json-view-num`,
  booleanValue: `${defaultStyles.booleanValue} json-view-kw`,
  nullValue: `${defaultStyles.nullValue} json-view-kw`,
  undefinedValue: `${defaultStyles.undefinedValue} json-view-kw`,
  otherValue: `${defaultStyles.otherValue} json-view-kw`,
  expandIcon: `${defaultStyles.expandIcon} json-view-no-toggle`,
  collapseIcon: `${defaultStyles.collapseIcon} json-view-no-toggle`,
  quotesForFieldNames: true,
};

/** Veto every expand/collapse, pinning the tree to the state {@link allExpanded} opens it in */
const keepExpanded = () => false;

/**
 * Every {@link JsonView} prop bar `data`, so viewers across the app read alike: fully expanded and
 * fixed that way, with the disclosure triangles hidden by {@link JSON_VIEW_STYLES}.
 *
 * Spread it — `<JsonView data={…} {...JSON_VIEW_PROPS} />` — or take {@link JSON_VIEW_STYLES} alone
 * to keep the palette while choosing different expansion behaviour.
 */
export const JSON_VIEW_PROPS = {
  style: JSON_VIEW_STYLES,
  shouldExpandNode: allExpanded,
  beforeExpandChange: keepExpanded,
};
