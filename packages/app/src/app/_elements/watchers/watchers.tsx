"use client";

import { ReactNode, useEffect, useState } from "react";
import { ArrowDown, X } from "lucide-react";

import { RecipeSummary, isRecipeEmpty } from "@/lib/recipe";
import {
  KeyFilter,
  KeyFilterSelect,
  getEnabledKeys,
} from "@/app/_elements/selects/key-filter-select";
import { QtyToggle } from "@/app/_elements/selects/qty-toggle-select";
import { applyQtyToggle, formatCompositionValue } from "@/lib/comp-value-format";
import { getAcceptablePropertyRange, isPropKeyQuantity } from "@/lib/sci-cream/sci-cream";
import {
  Color,
  colorVar,
  colorVarWithAlpha,
  getRangeColor,
  getReferenceOpacity,
} from "@/lib/styles/colors";
import { getLocalStorage, setLocalStorage } from "@/lib/local-storage";
import { COMPONENT_ACTION_ICON_SIZE } from "@/lib/styles/sizes";
import { STATE_VAL, standardInputStepByPercent } from "@/lib/util";

import { PropKey, getPropKeys, getMixProperty, prop_key_as_med_str } from "@workspace/sci-cream";

/** Map of `PropKey` to user-entered target value; sparse, only set entries are tracked */
export type TargetsMap = Partial<Record<PropKey, number>>;

/** localStorage key for the user's set of watched `PropKey`s */
export const WATCHER_SELECTED_PROPS_KEY = "watcher-selected-props";
/** localStorage key for the user's target values, keyed by `PropKey` */
export const WATCHER_TARGETS_KEY = "watcher-targets";

/**
 * Default set of properties auto-selected when no localStorage value is present.
 *
 * Limited to keys for which {@link getAcceptablePropertyRange} returns a defined range, since those
 * are the keys for which the color-coded range indicator is meaningful.
 */
export const DEFAULT_SELECTED_PROPERTIES: Set<PropKey> = new Set(
  getPropKeys().filter((key) => getAcceptablePropertyRange(key) !== undefined),
);

/** Format a numeric delta as a signed string (e.g. `+0.58`, `−0.47`); returns "" for NaN/undefined */
function formatDelta(delta: number | undefined): string {
  if (delta === undefined || Number.isNaN(delta)) return "";
  const formatted = formatCompositionValue(Math.abs(delta)).trim();
  if (formatted === "" || formatted === "-") return "";
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : " ";
  return `${sign}${formatted}`;
}

/**
 * Returns a CSS `var(...)` color reference for a delta value's sign: green for positive, red for
 * negative, `undefined` for zero/NaN/undefined (which falls back to the inherited text color).
 *
 * The colors are intentionally non-semantic w.r.t. "good/bad" — neither direction is inherently
 * better in formulation context. They serve purely as a directional readability cue.
 *
 * Returns a `var(...)` reference rather than a resolved color string to avoid SSR/client
 * hydration mismatches on inline `style` attributes; see {@link colorVar}.
 */
function getDeltaColor(delta: number | undefined): string | undefined {
  if (delta === undefined || Number.isNaN(delta) || delta === 0) return undefined;
  return colorVar(delta > 0 ? Color.GraphGreen : Color.GraphRedDull);
}

/**
 * Round `value` to the decimal precision implied by a number-input `step` string.
 *
 * E.g. step `"0.5"` → 1 decimal, step `"0.01"` → 2 decimals, step `"1"` → 0 decimals.
 *
 * Used to clean up values that get pushed into a number input from a higher-precision source
 * (e.g. a WASM-computed reference value), so the input doesn't display noisy trailing digits.
 */
function roundToStep(value: number, step: string): number {
  const decimals = step.split(".")[1]?.length ?? 0;
  return Number(value.toFixed(decimals));
}

/**
 * Format an acceptable `{ min, max }` range as `[min, max]`.
 *
 * Bracket + comma notation chosen over a dash separator so it remains unambiguous when one or
 * both bounds are negative (e.g. `[-18, -10]` vs the ambiguous `-18 – -10`).
 */
function formatRange(range: { min: number; max: number }): string {
  return `[${formatCompositionValue(range.min).trim()}, ${formatCompositionValue(range.max).trim()}]`;
}

/** Compute the display value for a `PropKey` on a recipe, using the `Percentage` qty toggle */
function getDisplayValue(propKey: PropKey, recipe: RecipeSummary): number | undefined {
  const raw = getMixProperty(recipe.mixProperties, propKey);
  return applyQtyToggle(
    raw,
    recipe.mixTotal,
    recipe.mixTotal,
    QtyToggle.Percentage,
    isPropKeyQuantity(propKey),
  );
}

/**
 * Bare presentational card for a single watched `PropKey`.
 *
 * Shows the main recipe value (large), per-reference value + delta rows, the acceptable range, and
 * a user-fillable target with optional import buttons from each active reference. The header
 * background is color-coded by where the main value sits within the acceptable range; absent range
 * or invalid value renders a neutral header.
 *
 * Toolbar/grid chrome and state ownership belong to the caller; this is pure props in, JSX out.
 */
export function WatcherCard({
  propKey,
  main,
  refs = [],
  target,
  onTargetChange,
  onRemove,
}: {
  propKey: PropKey;
  main: RecipeSummary;
  refs?: RecipeSummary[];
  target: number | undefined;
  onTargetChange: (val: number | undefined) => void;
  onRemove: () => void;
}) {
  const range = getAcceptablePropertyRange(propKey);

  const mainValue = getDisplayValue(propKey, main);
  const mainHasValue = mainValue !== undefined && !Number.isNaN(mainValue);

  const headerColor: Color =
    range && mainHasValue ? getRangeColor(mainValue, range) : Color.GraphGray;

  /**
   * Step for the target input, scaled to the magnitude of whatever value the user is editing
   * around (the current target if set, otherwise the current recipe value).
   */
  const targetStep = standardInputStepByPercent(target ?? (mainHasValue ? mainValue : undefined));

  return (
    <div
      className="border-brd-lt dark:border-brd-dk flex flex-col overflow-hidden rounded-md border text-sm"
      data-testid={`watcher-card-${String(propKey)}`}
      data-prop-key={String(propKey)}
    >
      {/* Header: property name + color-coded background + remove button */}
      <div
        className="flex items-center justify-between px-1.5 py-0.5 font-semibold"
        style={{ backgroundColor: colorVarWithAlpha(headerColor, 0.6) }}
      >
        <span title={prop_key_as_med_str(propKey)} className="truncate">
          {prop_key_as_med_str(propKey)}
        </span>
        <button
          className="action-button -mr-0.5 ml-1 px-0.5 py-0"
          onClick={onRemove}
          title="Remove from watchers"
          data-testid={`watcher-card-${String(propKey)}-remove`}
        >
          <X size={COMPONENT_ACTION_ICON_SIZE - 6} />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-0.5 px-1.5 py-1">
        {/* Main value + (optional) acceptable range, centered as a group */}
        <div className="flex items-baseline justify-center gap-1.5">
          <span className="comp-val text-lg" title="Current value">
            {formatCompositionValue(mainValue)}
          </span>
          {range && (
            <span
              className="text-txt-sec-lt dark:text-txt-sec-dk text-[11px]"
              title="Acceptable range"
            >
              {formatRange(range)}
            </span>
          )}
        </div>

        {/* Reference rows: letter doubles as a fill-target button, then value + delta */}
        {refs.map((ref, idx) => {
          const refValue = getDisplayValue(propKey, ref);
          const refHasValue = refValue !== undefined && !Number.isNaN(refValue);
          const delta = mainHasValue && refHasValue ? refValue - mainValue : undefined;
          const opacity = getReferenceOpacity(idx);
          const refLetter = ref.id.replace(/^Ref\s*/, "").trim() || ref.id;
          return (
            <div
              key={ref.id}
              className="flex items-center justify-between"
              style={{ opacity: opacity + 0.3 }}
              title={`${ref.id} value (delta from current)`}
              data-testid={`watcher-card-${String(propKey)}-ref-${ref.id}`}
            >
              {refHasValue ? (
                <button
                  className="action-button flex items-center px-0.5 py-0"
                  onClick={() => onTargetChange(roundToStep(refValue, targetStep))}
                  title={`Fill target from ${ref.id}`}
                  data-testid={`watcher-card-${String(propKey)}-fill-${ref.id}`}
                >
                  <ArrowDown size={COMPONENT_ACTION_ICON_SIZE - 10} />
                  <span className="text-[11px] font-semibold">{refLetter}</span>
                </button>
              ) : (
                <span className="comp-val w-3 text-left font-semibold">{refLetter}</span>
              )}
              <span className="comp-val">{formatCompositionValue(refValue)}</span>
              <span
                className="comp-val w-12 text-right text-[11px]"
                style={{ color: getDeltaColor(delta) }}
              >
                {formatDelta(delta)}
              </span>
            </div>
          );
        })}

        {/* Target row: input + (optional) inline delta-from-current */}
        <div className="flex items-center gap-0.5" title="Target value">
          <span className="comp-val text-txt-sec-lt dark:text-txt-sec-dk">{"▸"}</span>
          <input
            type="number"
            step={targetStep}
            className="select-input comp-val w-16 px-0.5 py-0"
            value={target ?? ""}
            placeholder="—"
            onChange={(e) => {
              const v = e.target.value;
              onTargetChange(v === "" ? undefined : parseFloat(v));
            }}
            data-testid={`watcher-card-${String(propKey)}-target`}
          />
          {target !== undefined && mainHasValue && (
            <span
              className="comp-val w-12 text-right text-[11px]"
              title="Delta from current to target"
              style={{ color: getDeltaColor(target - mainValue) }}
            >
              {formatDelta(target - mainValue)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Bare grid of {@link WatcherCard}s, laid out via CSS auto-fill so the cards reflow to fill the
 * available width. Caller controls which property keys are shown, the target map, and the per-card
 * change/remove handlers.
 */
export function WatchersGrid({
  propKeys,
  main,
  refs = [],
  targets,
  onTargetChange,
  onRemove,
}: {
  propKeys: PropKey[];
  main: RecipeSummary;
  refs?: RecipeSummary[];
  targets: TargetsMap;
  onTargetChange: (propKey: PropKey, val: number | undefined) => void;
  onRemove: (propKey: PropKey) => void;
}) {
  return (
    <div
      className="grid gap-2 p-1"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}
    >
      {propKeys.map((propKey) => (
        <WatcherCard
          key={String(propKey)}
          propKey={propKey}
          main={main}
          refs={refs}
          target={targets[propKey]}
          onTargetChange={(val) => onTargetChange(propKey, val)}
          onRemove={() => onRemove(propKey)}
        />
      ))}
    </div>
  );
}

/**
 * Watchers grid with an attached toolbar (`KeyFilterSelect`) that owns toolbar and target state.
 *
 * Selection and targets are persisted to `localStorage` on every change; on mount, initial values
 * are hydrated from storage when present (default selection used otherwise).
 *
 * `toolbarPrefix` is rendered inside the toolbar's flex row before the controls; used by the panel
 * wrapper to inject a drag handle without breaking the toolbar layout.
 *
 * Reserves a fixed-height footer slot below the grid for the future "Balance" interface; the slot
 * is empty in v1 but keeps the panel layout stable for later additions.
 */
export function WatchersView({
  main,
  refs = [],
  toolbarPrefix,
  defaultSelected = DEFAULT_SELECTED_PROPERTIES,
}: {
  main: RecipeSummary;
  refs?: RecipeSummary[];
  toolbarPrefix?: ReactNode;
  defaultSelected?: Set<PropKey>;
}) {
  const propsFilterState = useState<KeyFilter>(KeyFilter.Custom);
  const selectedPropsState = useState<Set<PropKey>>(defaultSelected);
  const [, setSelectedProps] = selectedPropsState;
  const [targets, setTargets] = useState<TargetsMap>({});

  // Hydrate selection + targets from localStorage on mount (client-only, after SSR pass)
  useEffect(() => {
    const stored = getLocalStorage<PropKey[]>(WATCHER_SELECTED_PROPS_KEY);
    if (stored) setSelectedProps(new Set(stored));
    const storedTargets = getLocalStorage<TargetsMap>(WATCHER_TARGETS_KEY);
    if (storedTargets) setTargets(storedTargets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist selection to localStorage on change
  useEffect(() => {
    setLocalStorage(WATCHER_SELECTED_PROPS_KEY, Array.from(selectedPropsState[STATE_VAL]));
  }, [selectedPropsState]);

  // Persist targets to localStorage on change
  useEffect(() => {
    setLocalStorage(WATCHER_TARGETS_KEY, targets);
  }, [targets]);

  /** Returns `true` when every recipe has a zero/NaN value for the given property key */
  const isPropEmpty = (propKey: PropKey) => {
    const recipes = [main, ...refs];
    if (recipes.every((r) => isRecipeEmpty(r))) return true;

    for (const recipe of recipes) {
      const propVal = getMixProperty(recipe.mixProperties, propKey);
      if (!(propVal === 0 || Number.isNaN(propVal))) {
        return false;
      }
    }
    return true;
  };

  /** Auto-filter heuristic: includes a property key when it is part of the default selection */
  const autoHeuristic = (propKey: PropKey) => defaultSelected.has(propKey);

  /** Returns the list of property keys to display, based on the current filter and selection */
  const getEnabledProps = () => {
    return getEnabledKeys(
      propsFilterState[STATE_VAL],
      selectedPropsState[STATE_VAL],
      getPropKeys,
      isPropEmpty,
      autoHeuristic,
    );
  };

  /** Update one target value; clearing (`undefined`) removes the entry to keep the map sparse */
  const onTargetChange = (propKey: PropKey, val: number | undefined) => {
    setTargets((prev) => {
      const next = { ...prev };
      if (val === undefined || Number.isNaN(val)) {
        delete next[propKey];
      } else {
        next[propKey] = val;
      }
      return next;
    });
  };

  /** Remove a property key from the watch list and drop its target entry, if any */
  const onRemove = (propKey: PropKey) => {
    setSelectedProps((prev) => {
      const next = new Set(prev);
      next.delete(propKey);
      return next;
    });
    setTargets((prev) => {
      if (!(propKey in prev)) return prev;
      const next = { ...prev };
      delete next[propKey];
      return next;
    });
  };

  return (
    <>
      <div className="flex items-center">
        {toolbarPrefix}
        <KeyFilterSelect
          supportedKeyFilters={[KeyFilter.Auto, KeyFilter.Custom]}
          keyFilterState={propsFilterState}
          selectedKeysState={selectedPropsState}
          getKeys={getPropKeys}
          key_as_med_str={prop_key_as_med_str}
        />
      </div>
      <div className="flex h-[calc(100%-33px)] flex-col">
        <div className="flex-1 overflow-y-auto">
          <WatchersGrid
            propKeys={getEnabledProps()}
            main={main}
            refs={refs}
            targets={targets}
            onTargetChange={onTargetChange}
            onRemove={onRemove}
          />
        </div>
        {/* Future Balance interface slot — empty in v1 to keep panel layout stable */}
        <div id="watchers-balance-slot" className="h-0" />
      </div>
    </>
  );
}
