"use client";

import { leafKey, usePersistedState } from "@/lib/hooks/use-persisted-state";

import { Select, type SelectOption } from "@/app/_elements/selects/select";
import { MeterRange, isUsableNumber } from "@/app/_elements/range-meter";
import { Color, getRangeColor, getTargetColor, worseStatusColor } from "@/lib/styles/colors";

/** What a value's status color conveys; see {@link resolveStatusColor}. */
export enum ColorMode {
  /// Target proximity when a target is set, else range position; gray when neither applies.
  Auto = "Auto",
  /// Position within the acceptable range; gray when the key has no range.
  Range = "Range",
  /// Proximity to the balancing target; gray when no target is set.
  Target = "Target",
  /// Worse of range position and target proximity, over whichever apply; gray when neither.
  Worst = "Worst",
}

/** Short label for each {@link ColorMode}, shown in the display-settings popover. */
export const COLOR_MODE_SHORT_LABELS: Record<ColorMode, string> = {
  [ColorMode.Auto]: "Auto",
  [ColorMode.Range]: "Range",
  [ColorMode.Target]: "Target",
  [ColorMode.Worst]: "Worst",
};

/**
 * Status {@link Color} for `value` under the chosen {@link ColorMode}, composed from the range- and
 * target-based primitives (`getRangeColor`, `getTargetColor`, `worseStatusColor`). Returns
 * `GraphGray` whenever the chosen mode has nothing to score against — an unusable value, a `Range`
 * mode with no range, or a `Target` mode with no target (`Target` never falls back to range).
 *
 * A zero (or non-usable) `target` yields no target color: `getTargetColor`'s relative delta is
 * undefined at zero, so target proximity can't be scored there.
 */
export function resolveStatusColor(
  mode: ColorMode,
  { range, value, target }: { range?: MeterRange; value?: number; target?: number },
): Color {
  if (!isUsableNumber(value)) return Color.GraphGray;

  const rangeColor = range && range.max > range.min ? getRangeColor(value, range) : undefined;
  const targetColor =
    isUsableNumber(target) && target !== 0 ? getTargetColor(value, target) : undefined;

  switch (mode) {
    case ColorMode.Range:
      return rangeColor ?? Color.GraphGray;
    case ColorMode.Target:
      return targetColor ?? Color.GraphGray;
    case ColorMode.Auto:
      return targetColor ?? rangeColor ?? Color.GraphGray;
    case ColorMode.Worst:
      if (rangeColor && targetColor) return worseStatusColor(rangeColor, targetColor);
      return rangeColor ?? targetColor ?? Color.GraphGray;
  }
}

/**
 * Persisted `[value, setter, supportedModes]` tuple for a {@link ColorMode} selection.
 *
 * `supportedModes` constrains which modes are valid for this site — stored values outside that list
 * are rejected and fall back to `defaultValue` (the first supported mode, `Auto` by default). When
 * `persistKey` is `undefined`, behaves as plain `useState`. Leaf key: `${persistKey}:color`.
 */
export function useColorModeState<const Modes extends [ColorMode, ...ColorMode[]]>(
  persistKey: string | undefined,
  {
    supportedModes = Object.values(ColorMode) as unknown as Modes,
    defaultValue = supportedModes[0],
  }: { supportedModes?: Modes; defaultValue?: Modes[number] } = {},
): [ColorMode, React.Dispatch<React.SetStateAction<ColorMode>>, Modes] {
  const [value, setValue] = usePersistedState(leafKey(persistKey, "color"), defaultValue, {
    isValid: (v) => (supportedModes as ColorMode[]).includes(v),
  });

  return [value, setValue, supportedModes];
}

/** Select element for switching between {@link ColorMode} coloring strategies. */
export function ColorModeSelect({
  supportedModes,
  colorModeState,
}: {
  supportedModes: ColorMode[];
  colorModeState: [ColorMode, React.Dispatch<React.SetStateAction<ColorMode>>];
}) {
  const [colorMode, setColorMode] = colorModeState;

  const options: SelectOption<ColorMode>[] = supportedModes.map((mode) => ({
    value: mode,
    label: COLOR_MODE_SHORT_LABELS[mode],
  }));

  return (
    <div id="color-toggle-select">
      <Select value={colorMode} onChange={setColorMode} options={options} />
    </div>
  );
}
