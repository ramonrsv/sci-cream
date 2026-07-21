"use client";

import { leafKey, usePersistedState } from "@/lib/hooks/use-persisted-state";

import { Select, type SelectOption } from "@/app/_elements/selects/select";

/** How a property's values map onto its 0–100 track; see `resolveMeterDomain` in `range-meter`. */
export enum NormMode {
  /// Union of the acceptable range, main value, references, and target, padded on each side.
  FullSpread = "FullSpread",
  /// Symmetric about the target so it sits at 50%; falls back to `FullSpread` without a target.
  TargetCentered = "TargetCentered",
  /// Symmetric about the main value so it sits at 50%; falls back to `FullSpread` without a value.
  ValueCentered = "ValueCentered",
  /// The acceptable range fills the padded track; falls back to `FullSpread` without a range.
  FillRange = "FillRange",
}

/** Short label for each {@link NormMode}, shown in the chart toolbar. */
export const NORM_MODE_SHORT_LABELS: Record<NormMode, string> = {
  [NormMode.FullSpread]: "Spread",
  [NormMode.TargetCentered]: "Target",
  [NormMode.ValueCentered]: "Value",
  [NormMode.FillRange]: "Range",
};

/**
 * Persisted `[value, setter, supportedModes]` tuple for a {@link NormMode} selection.
 *
 * `supportedModes` constrains which modes are valid for this site — stored values outside that list
 * are rejected and fall back to `defaultValue` (the first supported mode, `FullSpread` by default).
 * When `persistKey` is `undefined`, behaves as plain `useState`. Stored leaf key is
 * `${persistKey}:norm`.
 */
export function useNormModeState<const Modes extends [NormMode, ...NormMode[]]>(
  persistKey: string | undefined,
  {
    supportedModes = Object.values(NormMode) as unknown as Modes,
    defaultValue = supportedModes[0],
  }: { supportedModes?: Modes; defaultValue?: Modes[number] } = {},
): [NormMode, React.Dispatch<React.SetStateAction<NormMode>>, Modes] {
  const [value, setValue] = usePersistedState(leafKey(persistKey, "norm"), defaultValue, {
    isValid: (v) => (supportedModes as NormMode[]).includes(v),
  });

  return [value, setValue, supportedModes];
}

/** Select element for switching between {@link NormMode} normalization strategies. */
export function NormModeSelect({
  supportedModes,
  normModeState,
}: {
  supportedModes: NormMode[];
  normModeState: [NormMode, React.Dispatch<React.SetStateAction<NormMode>>];
}) {
  const [normMode, setNormMode] = normModeState;

  const options: SelectOption<NormMode>[] = supportedModes.map((mode) => ({
    value: mode,
    label: NORM_MODE_SHORT_LABELS[mode],
  }));

  return (
    <div id="normalize-toggle-select">
      <Select value={normMode} onChange={setNormMode} options={options} />
    </div>
  );
}
