"use client";

import { leafKey, usePersistedState } from "@/lib/hooks/use-persisted-state";
import { SELECT_ICON_SIZE } from "@/lib/styles/sizes";

import { Select, type SelectOption } from "@/app/_elements/selects/select";

/** Controls whether delta-from-reference columns are included, and how the delta is calculated */
export enum DeltaToggle {
  /// No delta columns are shown, only the main value columns are displayed
  Off = "Off",
  /// Deltas included, showing `main − ref` as an absolute diff in active display units
  Absolute = "Absolute",
  /// Deltas included, showing `main − ref` as a relative percent change between the two values
  Relative = "Relative",
}

/**
 * The delta glyph used in the control's mark and in delta column headers.
 *
 * This is ∆ U+2206 INCREMENT, not Δ U+0394 GREEK CAPITAL DELTA. The self-hosted Geist font ships
 * U+2206 but not U+0394, so U+2206 renders from the font itself in every environment. U+0394 would
 * fall back to a system font, making visual snapshots non-deterministic across local and CI.
 */
export const DELTA_GLYPH = "∆";

/** Short label for each `DeltaToggle` option, shown in the UI. */
export const DELTA_TOGGLE_SHORT_LABELS: Record<DeltaToggle, string> = {
  [DeltaToggle.Off]: "Off",
  [DeltaToggle.Absolute]: "Abs",
  [DeltaToggle.Relative]: "Rel",
};

/**
 * Persisted `[value, setter, supportedDeltaToggles]` tuple for a {@link DeltaToggle} selection.
 *
 * `supportedDeltaToggles` constrains which `DeltaToggle` values are valid for this site — stored
 * values outside that list are rejected and fall back to `defaultValue`. Defaults to all
 * `DeltaToggle` values when omitted. `defaultValue` is typed as `Toggles[number]` (a compile-time
 * error if it is not in `supportedDeltaToggles`), and defaults to the first supported toggle.
 *
 * When `persistKey` is `undefined`, it behaves as a plain `useState` (no storage touched). The
 * stored leaf key is `${persistKey}:delta`.
 */
export function useDeltaToggleState<const Toggles extends [DeltaToggle, ...DeltaToggle[]]>(
  persistKey: string | undefined,
  {
    supportedDeltaToggles = Object.values(DeltaToggle) as unknown as Toggles,
    defaultValue = supportedDeltaToggles[0],
  }: { supportedDeltaToggles?: Toggles; defaultValue?: Toggles[number] } = {},
): [DeltaToggle, React.Dispatch<React.SetStateAction<DeltaToggle>>, Toggles] {
  const [value, setValue] = usePersistedState(leafKey(persistKey, "delta"), defaultValue, {
    isValid: (v) => (supportedDeltaToggles as DeltaToggle[]).includes(v),
  });

  return [value, setValue, supportedDeltaToggles];
}

/** Name of the {@link DeltaToggleSelect} control, for its accessible name and tooltip. */
const DELTA_TOGGLE_LABEL = "Delta mode";

/**
 * {@link DELTA_GLYPH} drawn to sit like the lucide marks on the neighbouring selects — lucide has
 * no delta, and its `Triangle` is squat where ∆ is narrow and tall.
 *
 * Oversized and nudged down, since the ink fills only part of the em square and sits high in it.
 * Matched to the lucide marks' ink mass, not their height, at which a triangle reads larger.
 */
function DeltaMark() {
  return (
    <span
      className="mt-0.5 flex items-center justify-center leading-none font-bold"
      style={{ width: SELECT_ICON_SIZE, height: SELECT_ICON_SIZE, fontSize: SELECT_ICON_SIZE + 2 }}
    >
      {DELTA_GLYPH}
    </span>
  );
}

/** Select element for switching between `DeltaToggle` display modes */
export function DeltaToggleSelect({
  supportedDeltaToggles,
  deltaToggleState,
}: {
  supportedDeltaToggles: DeltaToggle[];
  deltaToggleState: [DeltaToggle, React.Dispatch<React.SetStateAction<DeltaToggle>>];
}) {
  const [deltaToggle, setDeltaToggle] = deltaToggleState;

  const options: SelectOption<DeltaToggle>[] = supportedDeltaToggles.map((dt) => ({
    value: dt,
    label: DELTA_TOGGLE_SHORT_LABELS[dt],
  }));

  return (
    <div id="delta-toggle-select">
      <Select
        value={deltaToggle}
        onChange={setDeltaToggle}
        options={options}
        icon={<DeltaMark />}
        ariaLabel={DELTA_TOGGLE_LABEL}
        title={`${DELTA_TOGGLE_LABEL} (${DELTA_TOGGLE_SHORT_LABELS[deltaToggle]})`}
      />
    </div>
  );
}
