import { expect } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Implementation-agnostic helpers for driving the app's `Select` widgets in unit tests.
//
// Test call sites should only use these generic helpers, never the underlying widget's DOM. They
// support both shapes the `Select` can take — a Headless UI listbox (current) and a native
// `<select>` — so swapping the implementation never touches the call sites, and the two coexist.
//
// Two ways to locate a select: by a wrapping `id` (the calculator panels), or by the control's
// accessible label (ad-hoc selects like the recipe-search version/slot pickers) — the `*ByLabel`
// variants.
// ---------------------------------------------------------------------------

/** True when `control` is a native `<select>` rather than a Headless UI listbox trigger button. */
function isNativeSelect(control: HTMLElement): control is HTMLSelectElement {
  return control.tagName === "SELECT";
}

/**
 * The control element of the select inside `wrapperSelector` (used for presence checks).
 *
 * Matches either a native `<select>` or a Headless UI listbox trigger (`aria-haspopup="listbox"`),
 * which also distinguishes it from sibling buttons like KeyFilter's "customize" button.
 */
export function getSelectControl(container: HTMLElement, wrapperSelector: string): HTMLElement {
  const control = container.querySelector(
    `${wrapperSelector} select, ${wrapperSelector} [aria-haspopup="listbox"]`,
  );
  expect(control).toBeInTheDocument();
  return control as HTMLElement;
}

/** The control element of the select whose control has accessible name `controlLabel`. */
export function getSelectControlByLabel(controlLabel: string): HTMLElement {
  // A native `<select>` is a `combobox`; the Headless UI trigger is a `button`.
  return (
    screen.queryByRole("combobox", { name: controlLabel }) ??
    screen.getByRole("button", { name: controlLabel })
  );
}

/** The label of the currently selected option, read from a control element. */
function selectedLabelOf(control: HTMLElement): string {
  if (isNativeSelect(control)) {
    return control.options[control.selectedIndex]?.text.trim() ?? "";
  }
  return control.textContent?.trim() ?? "";
}

/** The label of the currently selected option in the select inside `wrapperSelector`. */
export function getSelectedOptionLabel(container: HTMLElement, wrapperSelector: string): string {
  return selectedLabelOf(getSelectControl(container, wrapperSelector));
}

/** The label of the currently selected option in the select with accessible name `controlLabel`. */
export function getSelectedOptionLabelByLabel(controlLabel: string): string {
  return selectedLabelOf(getSelectControlByLabel(controlLabel));
}

/** Choose the option matching `optionLabel` in `control`. */
async function chooseOption(control: HTMLElement, optionLabel: string | RegExp) {
  const user = userEvent.setup();
  if (isNativeSelect(control)) {
    await user.selectOptions(control, within(control).getByRole("option", { name: optionLabel }));
    return;
  }
  await user.click(control);
  await user.click(await screen.findByRole("option", { name: optionLabel }));
}

/** Select the option matching `optionLabel` in the select inside `wrapperSelector`. */
export async function selectOption(
  container: HTMLElement,
  wrapperSelector: string,
  optionLabel: string | RegExp,
) {
  await chooseOption(getSelectControl(container, wrapperSelector), optionLabel);
}

/** Select the option matching `optionLabel` in the select with accessible name `controlLabel`. */
export async function selectOptionByLabel(controlLabel: string, optionLabel: string | RegExp) {
  await chooseOption(getSelectControlByLabel(controlLabel), optionLabel);
}

/** The labels of every option offered by `control` (opening it first when it's a listbox). */
async function readOptionLabels(control: HTMLElement): Promise<string[]> {
  if (isNativeSelect(control)) {
    return within(control)
      .queryAllByRole("option")
      .map((opt) => opt.textContent ?? "");
  }
  const user = userEvent.setup();
  await user.click(control);
  const labels = screen.queryAllByRole("option").map((opt) => opt.textContent ?? "");
  await user.keyboard("{Escape}");
  return labels;
}

/** The labels of every option offered by the select inside `wrapperSelector`. */
export async function getSelectOptionLabels(
  container: HTMLElement,
  wrapperSelector: string,
): Promise<string[]> {
  return readOptionLabels(getSelectControl(container, wrapperSelector));
}

/** The labels of every option offered by the select with accessible name `controlLabel`. */
export async function getSelectOptionLabelsByLabel(controlLabel: string): Promise<string[]> {
  return readOptionLabels(getSelectControlByLabel(controlLabel));
}
