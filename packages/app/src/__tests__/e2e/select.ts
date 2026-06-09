import { type Page, type Locator } from "@playwright/test";

// ---------------------------------------------------------------------------
// Implementation-agnostic helpers for driving the app's `Select` widgets in Playwright tests.
//
// Spec call sites should only use these generic helpers, never the underlying widget's DOM. The
// shared `Select` is a native `<select>`; `ThemeSelect` keeps a Headless UI listbox trigger, so
// these helpers transparently handle both. Panel-specific locators (e.g.
// `getPropertiesPanelKeyFilterSelectInput`) live in `./util` and build on these.
// ---------------------------------------------------------------------------

/**
 * Get the currently open listbox menu, for the Headless UI selects (e.g. `ThemeSelect`).
 *
 * Native `<select>` dropdowns are rendered by the OS and never enter the DOM, so this only applies
 * to the listbox-based selects.
 */
export function getOpenSelectMenu(page: Page) {
  return page.getByRole("listbox");
}

/**
 * Get the interactive control of the `Select` scoped by `scopeSelector` (e.g. a panel + select id).
 *
 * Implementation detail: the shared `Select` is a native `<select>`; `ThemeSelect` is a Headless UI
 * listbox trigger (`aria-haspopup="listbox"`). Matching either — and taking the first — picks the
 * select while skipping sibling buttons (like KeyFilter's "customize" button). Only this function
 * and {@link selectOption} know about the underlying widgets.
 */
export function getSelectControl(page: Page, scopeSelector: string): Locator {
  return page
    .locator(`${scopeSelector} select, ${scopeSelector} [aria-haspopup="listbox"]`)
    .first();
}

/**
 * Choose the option labelled `optionLabel` from the `Select` whose control element is `control`.
 *
 * Uses the native `<select>` API for the shared selects, and the click-through listbox flow for the
 * Headless UI ones (`ThemeSelect`).
 */
export async function selectOption(
  page: Page,
  control: Locator,
  optionLabel: string,
  options?: { timeout?: number },
) {
  if ((await control.evaluate((el) => el.tagName)) === "SELECT") {
    await control.selectOption({ label: optionLabel }, options);
    return;
  }

  // Headless UI listbox: short-circuit re-selecting the current value (a no-op in the listbox too).
  // Falls through when the trigger text doesn't match (e.g. an icon-only trigger), never wrongly
  // skipping.
  if ((await control.textContent())?.trim() === optionLabel) return;

  await control.click(options);

  // Scope the lookup to the open menu, so it never matches unrelated `role="option"` elements
  // elsewhere on the page.
  await getOpenSelectMenu(page)
    .getByRole("option", { name: optionLabel, exact: true })
    .click(options);
}
