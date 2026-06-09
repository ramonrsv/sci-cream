import { expect } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Implementation-agnostic helpers for driving the app's `Select` widgets in unit tests.
//
// Test call sites should only use these generic helpers, never the underlying widget's DOM
// (currently a native `<select>`). If the selects ever switch to a custom dropdown, only the
// bodies below need re-implementing — the tests that call them stay unchanged.
//
// Two ways to locate a select: by a wrapping `id` (the calculator panels), or by the control's
// accessible label (ad-hoc selects like the recipe-search version/slot pickers) — the `*ByLabel`
// variants.
// ---------------------------------------------------------------------------

/**
 * The control element of the select inside `wrapperSelector` (used for presence checks).
 *
 * Implementation detail: the control is the native `<select>` element. A plain tag selector
 * distinguishes it from sibling buttons (like KeyFilter's "customize" button) inside the wrapper.
 */
export function getSelectControl(container: HTMLElement, wrapperSelector: string): HTMLElement {
  const control = container.querySelector(`${wrapperSelector} select`);
  expect(control).toBeInTheDocument();
  return control as HTMLElement;
}

/** The control element of the select whose control has accessible name `controlLabel`. */
export function getSelectControlByLabel(controlLabel: string): HTMLElement {
  return screen.getByRole("combobox", { name: controlLabel });
}

/** The label of the currently selected option, read from a control element. */
function selectedLabelOf(control: HTMLElement): string {
  const select = control as HTMLSelectElement;
  return select.options[select.selectedIndex]?.text.trim() ?? "";
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
  const option = within(control).getByRole("option", { name: optionLabel });
  await user.selectOptions(control, option);
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

/** The labels of every option offered by `control`. */
function readOptionLabels(control: HTMLElement): string[] {
  return within(control)
    .queryAllByRole("option")
    .map((opt) => opt.textContent ?? "");
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
