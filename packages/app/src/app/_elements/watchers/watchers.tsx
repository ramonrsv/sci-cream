"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronsUp,
  ChevronUp,
  X,
} from "lucide-react";

import { Recipe, RecipeSummary, isRecipeEmpty, makeLightRecipe } from "@/lib/recipe";
import {
  KeyFilter,
  KeyFilterSelect,
  getEnabledKeys,
  useKeyFilterState,
} from "@/app/_elements/selects/key-filter-select";
import { QtyToggle } from "@/app/_elements/selects/qty-toggle-select";
import { useOrderKeys } from "@/lib/group-by";
import { applyQtyToggle, formatCompositionValue } from "@/lib/comp-value-format";
import {
  getAcceptablePropertyRange,
  isPropKeyQuantity,
  isPropKeyMixScope,
} from "@/lib/sci-cream/sci-cream";
import {
  Color,
  getCssColor,
  getRangeColor,
  NO_RANGE_GRAY_ALPHA,
  REFERENCE_TICK_ALPHA,
} from "@/lib/styles/colors";
import { STORAGE_KEYS } from "@/lib/local-storage";
import { usePersistedState } from "@/lib/use-persisted-state";
import { COMPONENT_ACTION_ICON_SIZE } from "@/lib/styles/sizes";
import { STATE_VAL, STATE_SET, roundToStep, standardInputStepByPercent, verify } from "@/lib/util";

import {
  PropKey,
  getPropKeys,
  getMixProperty,
  groupEnabledKeys,
  prop_key_as_med_str,
  compToPropKey,
  CompKey,
  fpdToPropKey,
  FpdKey,
  isCompKey,
  isRatioKey,
  Bridge as WasmBridge,
  prop_key_as_short_str,
  Priority,
  BalancingReport,
  type LightRecipe,
  type BalanceTargets,
  type BalancePriorities,
  getTypicalBalancingKeys,
} from "@workspace/sci-cream";

import { WatcherIssues, KeyIssue } from "@/app/_elements/watchers/watcher-issues";

/** Map of `PropKey` to user-entered target value; sparse, only set entries are tracked */
export type TargetsMap = Partial<Record<PropKey, number>>;

/**
 * Map of `PropKey` to user-chosen balancing {@link Priority}; sparse, only
 * non-{@link Priority.Normal} entries are tracked — both above-Normal ({@link Priority.High},
 * {@link Priority.Critical}) and below-Normal ({@link Priority.Low}).
 */
export type PrioritiesMap = Partial<Record<PropKey, Priority>>;

/** Opacity for the faint Normal-priority dot, so it recedes into the background. */
const PRIORITY_NORMAL_OPACITY = 0.6;
/** Opacity for the reference value rows, de-emphasized relative to the main value above them. */
const REF_ROW_OPACITY = 0.8;

/** Ordered priority cycle for the click-to-cycle control: Low → Normal → High → Critical → Low. */
const PRIORITY_CYCLE = [Priority.Low, Priority.Normal, Priority.High, Priority.Critical] as const;

/** The next priority in {@link PRIORITY_CYCLE}, wrapping back to Low after Critical. */
function nextPriority(priority: Priority): Priority {
  const i = PRIORITY_CYCLE.indexOf(priority);
  return PRIORITY_CYCLE[(i + 1) % PRIORITY_CYCLE.length];
}

/**
 * Glyph for the per-target balancing {@link Priority}, conveying level by both shape and color:
 * a faint dot at `Normal` (recedes into the background), an amber single up-chevron at `High`, and
 * a red double up-chevron at `Critical`. Inline `color` is set via SSR-safe {@link getCssColor}.
 */
function PriorityMarker({ priority }: { priority: Priority }) {
  const size = COMPONENT_ACTION_ICON_SIZE;

  switch (priority) {
    case Priority.Low:
      return (
        <ChevronDown size={size} strokeWidth={4} style={{ color: getCssColor(Color.GraphBlue) }} />
      );
    case Priority.High:
      return (
        <ChevronUp size={size} strokeWidth={4} style={{ color: getCssColor(Color.GraphOrange) }} />
      );
    case Priority.Critical:
      return (
        <ChevronsUp
          size={size}
          strokeWidth={3}
          style={{ color: getCssColor(Color.GraphRedDull) }}
        />
      );
    default:
      return (
        <span
          className="inline-block h-1.25 w-1.25 rounded-full bg-current"
          style={{ opacity: PRIORITY_NORMAL_OPACITY }}
          aria-hidden
        />
      );
  }
}

/** Mix-scope property keys: all `getPropKeys`, minus ingredient-only ratio keys. */
function getMixScopePropKeys(): PropKey[] {
  return getPropKeys().filter(isPropKeyMixScope);
}

/** Default set of property keys shown when the Custom key filter is first initialized */
export const DEFAULT_SELECTED_PROPERTIES: Set<PropKey> = new Set(
  getTypicalBalancingKeys()
    .concat([fpdToPropKey(FpdKey.ServingTemp), fpdToPropKey(FpdKey.HardnessAt14C)])
    .filter((key) => key !== compToPropKey(CompKey.Alcohol)),
);

/** Type predicate: `val` is a defined, non-NaN number (i.e. a real computed numeric result). */
function isUsableNumber(val: number | undefined): val is number {
  return val !== undefined && !Number.isNaN(val);
}

/**
 * How a target delta should display: `met` when the value matches the target to display precision
 * (magnitude rounds to zero), otherwise a direction arrow (▲ up / ▼ down) and formatted magnitude,
 * the arrow split out so it can render at its own smaller size beside the digits.
 */
type DeltaDisplay = { met: true } | { met: false; arrow: string; magnitude: string };

/** Resolve a numeric delta to its {@link DeltaDisplay}; null for NaN/undefined. */
function formatDelta(delta: number | undefined): DeltaDisplay | null {
  if (!isUsableNumber(delta)) return null;

  const magnitude = formatCompositionValue(Math.abs(delta)).trim();
  if (magnitude === "" || magnitude === "-") return null;
  if (magnitude === "0") return { met: true };

  return { met: false, arrow: delta > 0 ? "▲" : "▼", magnitude };
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

/**
 * Position (0–100) of `value` along the range-meter track. The track's domain is `range` padded by
 * `padFrac` of its width on each side, so the acceptable band occupies the centre and out-of-range
 * values land near (and clamp to) the edges. Status color, not position, conveys severity past the
 * edge, so clamping rather than overflowing is fine.
 */
function valueToMeterPct(
  value: number,
  range: { min: number; max: number },
  padFrac = 0.2,
): number {
  const pad = (range.max - range.min) * padFrac;
  const lo = range.min - pad;
  const hi = range.max + pad;
  return Math.max(0, Math.min(1, (value - lo) / (hi - lo))) * 100;
}

/**
 * Filter a `TargetsMap` to balanceable entries that are currently watched (in `enabledSet`), as
 * `[keyName, value][]` expected by `Bridge.balance_recipe` for the flat name <-> JsValue boundary.
 *
 * Balanceable keys are the extensive `CompKey`s and the intensive `RatioKey`s (not `FpdKey`). A
 * `PropKey` for either is its variant name string (see `compToPropKey` / `ratioToPropKey`), which
 * is what the Bridge expects, so the propKey passes through with no conversion.
 *
 * Restricting to `enabledSet` keeps the balancer aligned with what the user sees — targets
 * persisted in localStorage but filtered out of view aren't silently applied.
 */
function targetsToBalanceArgs(targets: TargetsMap, enabledSet: Set<PropKey>): BalanceTargets {
  return Object.entries(targets)
    .filter(
      ([propKey, val]) =>
        isUsableNumber(val) &&
        (isCompKey(propKey as PropKey) || isRatioKey(propKey as PropKey)) &&
        enabledSet.has(propKey as PropKey),
    )
    .map(([propKey, val]) => [propKey as PropKey, val as number]);
}

/**
 * Build the `BalancePriorities` list expected by `Bridge.balance_recipe`, from the
 * `PrioritiesMap`, restricted to keys that actually carry a balanced target (`balanceTargets`).
 *
 * Entries are emitted only for non-`Normal` priorities on keys with a target: `Normal` is the
 * solver default (weight 1) so listing it is a no-op, and a priority on a key without a target
 * would trip the crate's `PriorityWithoutTarget` validation warning.
 */
function prioritiesToBalanceArgs(
  priorities: PrioritiesMap,
  balanceTargets: BalanceTargets,
): BalancePriorities {
  const targetKeys = new Set(balanceTargets.map(([keyName]) => String(keyName)));
  return Object.entries(priorities)
    .filter(
      ([propKey, priority]) =>
        priority !== undefined && priority !== Priority.Normal && targetKeys.has(propKey),
    )
    .map(([propKey, priority]) => [propKey as PropKey, priority as Priority]);
}

/**
 * Mutate `targets` in place: set `propKey` to `val` when defined and finite, otherwise remove the
 * entry to keep the map sparse.
 */
function setOrClearTarget(targets: TargetsMap, propKey: PropKey, val: number | undefined): void {
  if (!isUsableNumber(val)) {
    delete targets[propKey];
  } else {
    targets[propKey] = val;
  }
}

/** Step for a target input, scaled to `target` if set, else `mainValue` (NaN-safe). */
function getTargetStep(target: number | undefined, mainValue: number | undefined): string {
  return standardInputStepByPercent(target ?? (isUsableNumber(mainValue) ? mainValue : undefined));
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
 * Shows the main recipe value (large), the acceptable range, a user-fillable target row with a
 * click-to-cycle balancing-priority marker ({@link PriorityMarker}, defaulting to
 * {@link Priority.Normal}), and per-reference value + delta rows below it (each with an import
 * button). The header background is color-coded by where the main value sits within the acceptable
 * range; absent range or invalid value renders a neutral header. The target delta is an uncolored
 * direction triangle (▲/▼) + magnitude, or a green check when the target is met (delta ≈ 0).
 *
 * The remove (✕) button is shown only when `removable` (default `true`); callers hide it where
 * removal has no effect — e.g. under the `Auto` key filter, which derives its key set from a
 * heuristic and ignores the user selection, so removing a key would not hide the card.
 *
 * When `issue` is set, the card is outlined (red for an error, amber for a warning) and a matching
 * icon appears in the header, its tooltip carrying the issue message(s).
 *
 * Toolbar/grid chrome and state ownership belong to the caller; this is pure props in, JSX out.
 */
export function WatcherCard({
  propKey,
  main,
  refs = [],
  target,
  priority = Priority.Normal,
  issue,
  removable = true,
  onTargetChange,
  onPriorityChange,
  onRemove,
}: {
  propKey: PropKey;
  main: RecipeSummary;
  refs?: RecipeSummary[];
  target: number | undefined;
  priority?: Priority;
  issue?: KeyIssue;
  removable?: boolean;
  onTargetChange: (val: number | undefined) => void;
  onPriorityChange: (priority: Priority) => void;
  onRemove: () => void;
}) {
  const range = getAcceptablePropertyRange(propKey);

  const mainValue = getDisplayValue(propKey, main);
  const mainHasValue = isUsableNumber(mainValue);

  const headerColor: Color =
    range && mainHasValue ? getRangeColor(mainValue, range) : Color.GraphGray;

  const targetStep = getTargetStep(target, mainValue);

  const targetDelta = target !== undefined && mainHasValue ? formatDelta(target - mainValue) : null;

  const meterRange = range && range.max > range.min ? range : undefined;
  const nonEmptyRefs = refs.filter((ref) => !isRecipeEmpty(ref));

  const issueBorderClass = issue ? `issue-card-${issue.severity}` : "";
  const issueTextClass = issue ? `issue-text-${issue.severity}` : "";

  return (
    <div
      className={`data-card-flat flex flex-col text-sm ${issueBorderClass}`}
      data-testid={`watcher-card-${String(propKey)}`}
      data-prop-key={String(propKey)}
    >
      {/* Slim status rail: at-a-glance range status, color-coded like the meter marker below. */}
      <div
        className="h-1.5 w-full"
        style={{
          backgroundColor: getCssColor(headerColor),
          opacity: headerColor === Color.GraphGray ? NO_RANGE_GRAY_ALPHA : undefined,
        }}
        aria-hidden
      />

      {/* Header: priority toggle + property name (left), issue icon + remove button (right). */}
      <div className="flex items-center justify-between px-1.5 pt-1 pb-0.5">
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            className="action-button -mr-0.75 -ml-1 flex h-5 w-5 shrink-0 items-center justify-center p-0"
            onClick={() => onPriorityChange(nextPriority(priority))}
            title={`Balancing priority: ${priority} (click to change)`}
            aria-label={`Balancing priority: ${priority}`}
            data-priority={priority}
            data-testid={`watcher-card-${String(propKey)}-priority`}
          >
            <PriorityMarker priority={priority} />
          </button>
          <span
            title={prop_key_as_short_str(propKey)}
            className="text-secondary truncate text-xs font-medium tracking-wide uppercase"
          >
            {prop_key_as_short_str(propKey)}
          </span>
        </div>
        <div className="mx-1 flex shrink-0 items-center gap-0.5">
          {issue && (
            <span
              className={`flex items-center ${issueTextClass}`}
              title={issue.titles.join("\n")}
              data-testid={`watcher-card-${String(propKey)}-issue`}
              data-severity={issue.severity}
            >
              {issue.severity === "error" ? (
                <AlertCircle size={COMPONENT_ACTION_ICON_SIZE - 5} />
              ) : (
                <AlertTriangle size={COMPONENT_ACTION_ICON_SIZE - 5} />
              )}
            </span>
          )}
          {removable && (
            <button
              className="action-button -mr-1.5 px-0.5 py-0"
              onClick={onRemove}
              title="Remove from watchers"
              data-testid={`watcher-card-${String(propKey)}-remove`}
            >
              <X size={COMPONENT_ACTION_ICON_SIZE - 5} />
            </button>
          )}
        </div>
      </div>

      {/* Body fills the card height (cards in a grid row are stretched equal) so the refs can
          be pinned to the bottom and line up across cards with and without a range meter. */}
      <div className="flex flex-1 flex-col gap-1 px-1.5 pb-1.5">
        {/* Fixed-width pieces keep the row layout identical on every card, full or empty. */}
        <div className="flex items-center justify-evenly">
          <span className="comp-val -ml-2 w-14 text-lg leading-none" title="Current value">
            {/* Placeholder whitespace keeps empty cards the same height. */}
            {formatCompositionValue(mainValue).trim() || "\u00A0"}
          </span>
          <div className="flex items-center gap-0.5" title="Target value">
            <input
              type="number"
              step={targetStep}
              className="boxed-input comp-val w-14 px-0.5 py-0"
              value={target ?? ""}
              placeholder={"\u2014"}
              onChange={(e) => {
                const v = e.target.value;
                onTargetChange(v === "" ? undefined : parseFloat(v));
              }}
              data-testid={`watcher-card-${String(propKey)}-target`}
            />
            {/* Reserve the delta slot so the input doesn't shift as the target changes. */}
            <span
              className="comp-val text-secondary -mr-3 w-9 text-left text-[11px]"
              title={targetDelta?.met ? "Target met" : "Delta from current to target"}
              data-testid={`watcher-card-${String(propKey)}-target-delta`}
            >
              {targetDelta &&
                (targetDelta.met ? (
                  <Check
                    size={COMPONENT_ACTION_ICON_SIZE - 5}
                    className="inline align-text-bottom"
                    style={{ color: getCssColor(Color.GraphGreen) }}
                    aria-label="Target met"
                    data-testid={`watcher-card-${String(propKey)}-target-met`}
                  />
                ) : (
                  <>
                    {/* Arrow sized in `em` so it scales with the digits but stays smaller. */}
                    <span className="mr-px text-[0.7em]">{targetDelta.arrow}</span>
                    {targetDelta.magnitude}
                  </>
                ))}
            </span>
          </div>
        </div>

        {/* Range meter (signature): acceptable band + current marker + target/reference ticks */}
        {meterRange && (
          <div
            className="flex items-center gap-1"
            aria-hidden
            title={`Acceptable range ${formatRange(meterRange)}`}
          >
            <span className="text-secondary text-[10px] leading-none">
              {formatCompositionValue(meterRange.min).trim()}
            </span>
            <div className="range-meter" data-testid={`watcher-card-${String(propKey)}-meter`}>
              <div
                className="range-meter-band"
                style={{
                  left: `${valueToMeterPct(meterRange.min, meterRange)}%`,
                  right: `${100 - valueToMeterPct(meterRange.max, meterRange)}%`,
                }}
              />
              {nonEmptyRefs.map((ref) => {
                const refValue = getDisplayValue(propKey, ref);
                return isUsableNumber(refValue) ? (
                  <span
                    key={ref.id}
                    className="range-meter-tick"
                    style={{
                      left: `${valueToMeterPct(refValue, meterRange)}%`,
                      height: "0.5rem",
                      backgroundColor: "currentColor",
                      opacity: REFERENCE_TICK_ALPHA,
                    }}
                  />
                ) : null;
              })}
              {isUsableNumber(target) && (
                <span
                  className="range-meter-tick"
                  style={{
                    left: `${valueToMeterPct(target, meterRange)}%`,
                    backgroundColor: getCssColor(Color.GraphBlue),
                  }}
                />
              )}
              {isUsableNumber(mainValue) && (
                <span
                  className="range-meter-marker"
                  style={{
                    left: `${valueToMeterPct(mainValue, meterRange)}%`,
                    backgroundColor: getCssColor(headerColor),
                  }}
                  data-testid={`watcher-card-${String(propKey)}-meter-current`}
                />
              )}
            </div>
            <span className="text-secondary text-[10px] leading-none">
              {formatCompositionValue(meterRange.max).trim()}
            </span>
          </div>
        )}

        {/* Reference values side by side: each letter doubles as a fill-target button. `mt-auto`
            pins it to the bottom of the card so refs line up across cards (meter or not). */}
        {nonEmptyRefs.length > 0 && (
          <div className="mt-auto grid grid-cols-2 gap-x-0 gap-y-0.5">
            {refs.map((ref) => {
              // A cell per ref keeps the layout stable; hidden when it lacks the key.
              const refValue = getDisplayValue(propKey, ref);
              const refHasValue = isUsableNumber(refValue);
              const refLetter = ref.id.replace(/^Ref\s*/, "").trim() || ref.id;

              return (
                <div
                  key={ref.id}
                  className="flex items-center justify-center gap-1"
                  style={{
                    opacity: REF_ROW_OPACITY,
                    visibility: refHasValue ? "visible" : "hidden",
                  }}
                  title={`${ref.id} value`}
                  data-testid={`watcher-card-${String(propKey)}-ref-${ref.id}`}
                  aria-hidden={!refHasValue}
                >
                  <button
                    className="action-button flex items-center px-0.5"
                    onClick={() => onTargetChange(roundToStep(refValue!, targetStep))}
                    title={`Fill target from ${ref.id}`}
                    data-testid={`watcher-card-${String(propKey)}-fill-${ref.id}`}
                    style={{ visibility: refHasValue ? "visible" : "hidden" }}
                  >
                    <ArrowUp size={COMPONENT_ACTION_ICON_SIZE - 10} />
                    <span className="pt-0.5 text-[11px] font-semibold">{refLetter}</span>
                  </button>
                  <span className="comp-val">{formatCompositionValue(refValue).trim()}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Bare grid of {@link WatcherCard}s, laid out via CSS auto-fill so the cards reflow to fill the
 * available width. Caller controls which property keys are shown, the target and priority maps, the
 * per-key validation issues (`issuesByKey`), and the per-card change/remove handlers. `removable`
 * (default `true`) is forwarded to every card to toggle its remove button.
 */
export function WatchersGrid({
  propKeys,
  main,
  refs = [],
  targets,
  priorities,
  issuesByKey = {},
  removable = true,
  onTargetChange,
  onPriorityChange,
  onRemove,
}: {
  propKeys: PropKey[];
  main: RecipeSummary;
  refs?: RecipeSummary[];
  targets: TargetsMap;
  priorities: PrioritiesMap;
  issuesByKey?: Partial<Record<PropKey, KeyIssue>>;
  removable?: boolean;
  onTargetChange: (propKey: PropKey, val: number | undefined) => void;
  onPriorityChange: (propKey: PropKey, priority: Priority) => void;
  onRemove: (propKey: PropKey) => void;
}) {
  return (
    <div
      className="border-brd grid overflow-hidden border-t border-l *:-mt-px *:-ml-px"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
    >
      {propKeys.map((propKey) => (
        <WatcherCard
          key={String(propKey)}
          propKey={propKey}
          main={main}
          refs={refs}
          target={targets[propKey]}
          priority={priorities[propKey] ?? Priority.Normal}
          issue={issuesByKey[propKey]}
          removable={removable}
          onTargetChange={(val) => onTargetChange(propKey, val)}
          onPriorityChange={(priority) => onPriorityChange(propKey, priority)}
          onRemove={() => onRemove(propKey)}
        />
      ))}
    </div>
  );
}

/**
 * Watchers grid with an attached toolbar (`KeyFilterSelect`) that owns toolbar, target, and
 * per-target priority state.
 *
 * Selection, targets, and priorities are persisted to `localStorage` on every change; on mount,
 * initial values are hydrated from storage when present (default selection used otherwise).
 *
 * `toolbarPrefix` is rendered inside the toolbar's flex row before the controls; used by the panel
 * wrapper to inject a drag handle without breaking the toolbar layout.
 *
 * The toolbar's right-side action group has a Balance button (runs the WASM balancer using
 * watched CompKey-derived targets and their priorities, then calls `onApplyBalancedMain`) and one
 * Fill-from-Ref button per non-empty reference (fills currently-watched targets from that
 * reference's values). Both are inert without `wasmBridge` and `onApplyBalancedMain`, so bare
 * renders stay read-only.
 *
 * When a `wasmBridge` is present, targets are validated live via `validate_recipe_targets`: a
 * {@link WatcherIssues} chip in the toolbar summarizes any errors and warnings (its popover lists
 * the messages), the affected cards are marked, and the Balance button is disabled while any error
 * stands (warnings are advisory).
 */
export function WatchersView({
  main,
  refs = [],
  toolbarPrefix,
  defaultSelected = DEFAULT_SELECTED_PROPERTIES,
  wasmBridge,
  onApplyBalancedMain,
  persistKey,
}: {
  main: Recipe;
  refs?: RecipeSummary[];
  toolbarPrefix?: ReactNode;
  defaultSelected?: Set<PropKey>;
  wasmBridge?: WasmBridge;
  onApplyBalancedMain?: (balanced: LightRecipe) => void;
  persistKey?: string;
}) {
  const {
    keyFilterState: propsFilterState,
    selectedKeysState: selectedPropsState,
    supportedKeyFilters,
  } = useKeyFilterState(persistKey, {
    defaultSelected,
    getKeys: getMixScopePropKeys,
    supportedKeyFilters: [KeyFilter.Auto, KeyFilter.Custom],
  });

  const [targets, setTargets] = usePersistedState<TargetsMap>(STORAGE_KEYS.watcherTargets, {});
  const [priorities, setPriorities] = usePersistedState<PrioritiesMap>(
    STORAGE_KEYS.watcherPriorities,
    {},
  );

  const [balanceError, setBalanceError] = useState<string | undefined>(undefined);
  const orderKeys = useOrderKeys<PropKey>(groupEnabledKeys);

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
      getMixScopePropKeys,
      isPropEmpty,
      autoHeuristic,
    );
  };

  /** Update one target value; clearing (`undefined`) removes the entry to keep the map sparse */
  const onTargetChange = (propKey: PropKey, val: number | undefined) => {
    setTargets((prev) => {
      const next = { ...prev };
      setOrClearTarget(next, propKey, val);
      return next;
    });
  };

  /** Set one target's balancing priority; `Normal` (the default) drops the entry to stay sparse */
  const onPriorityChange = (propKey: PropKey, priority: Priority) => {
    setPriorities((prev) => {
      const next = { ...prev };
      if (priority === Priority.Normal) {
        delete next[propKey];
      } else {
        next[propKey] = priority;
      }
      return next;
    });
  };

  /** Remove a property key from the watch list and drop its target and priority entries, if any */
  const onRemove = (propKey: PropKey) => {
    selectedPropsState[STATE_SET]((prev) => {
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

    setPriorities((prev) => {
      if (!(propKey in prev)) return prev;
      const next = { ...prev };
      delete next[propKey];
      return next;
    });
  };

  const enabledProps = getEnabledProps();
  const balanceTargets = targetsToBalanceArgs(targets, new Set(enabledProps));
  const balancePriorities = prioritiesToBalanceArgs(priorities, balanceTargets);

  // Validate targets live (cheap, no solve) so issues surface before the user clicks Balance.
  // `JSON.stringify` of the small target/priority arrays gives stable memo deps.
  const report = useMemo<BalancingReport | undefined>(() => {
    if (!wasmBridge || isRecipeEmpty(main) || balanceTargets.length === 0) {
      return undefined;
    }

    try {
      const lightRecipe = makeLightRecipe(main, (n) => wasmBridge.has_ingredient(n));
      return wasmBridge.validate_recipe_targets(
        lightRecipe,
        balanceTargets,
        balancePriorities,
      ) as BalancingReport;
    } catch (err) {
      console.error("validate failed:", err);
      return undefined;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wasmBridge, main, JSON.stringify(balanceTargets), JSON.stringify(balancePriorities)]);

  const issues = report?.issues ?? [];
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const hasErrors = errorCount > 0;

  // Per-key issue marks for the cards: an issue may touch several keys, and a key may collect
  // several issues; error severity wins over warning on any key they share.
  const issuesByKey = useMemo(() => {
    const map: Partial<Record<PropKey, KeyIssue>> = {};
    for (const { severity, keys, message } of report?.issues ?? []) {
      for (const key of keys) {
        const existing = map[key as PropKey];
        if (existing) {
          existing.titles.push(message);
          if (severity === "error") existing.severity = "error";
        } else {
          map[key as PropKey] = { severity, titles: [message] };
        }
      }
    }
    return map;
  }, [report]);

  // Drop a stale runtime balance error once the inputs change, so a prior failure doesn't linger.
  useEffect(() => {
    setBalanceError(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(balanceTargets), JSON.stringify(balancePriorities), main]);

  // Removal only takes effect under the Custom filter (which derives its keys from the selection);
  // under Auto, the heuristic ignores the selection, so the remove button is hidden there.
  const removable = propsFilterState[STATE_VAL] === KeyFilter.Custom;

  /**
   * Balance the main recipe to the current targets, passing the result to `onApplyBalancedMain`.
   * NNLS failures (infeasible targets) surface as an inline error on the Balance button.
   */
  const onBalance = () => {
    // The 'Balance' button should not be enabled if any of these conditions aren't met
    verify(wasmBridge !== undefined, "wasmBridge undefined");
    verify(onApplyBalancedMain !== undefined, "onApplyBalancedMain undefined");
    verify(!isRecipeEmpty(main), "main recipe is empty");
    verify(balanceTargets.length > 0, "no CompKey targets");

    try {
      const lightRecipe = makeLightRecipe(main, (n) => wasmBridge.has_ingredient(n));

      const balanced = wasmBridge.balance_recipe(
        lightRecipe,
        balanceTargets,
        balancePriorities,
      ) as LightRecipe;

      setBalanceError(undefined);
      onApplyBalancedMain(balanced);
    } catch (err) {
      console.error("balance failed:", err);
      setBalanceError(String(err));
    }
  };

  /** Mirror watched targets from `ref` (rounded to the input's step); clear keys `ref` lacks. */
  const onFillTargetsFromRef = (ref: RecipeSummary) => {
    setTargets((prev) => {
      const next = { ...prev };
      for (const propKey of enabledProps) {
        const refVal = getDisplayValue(propKey, ref);
        const step = getTargetStep(prev[propKey], getDisplayValue(propKey, main));
        const val = isUsableNumber(refVal) ? roundToStep(refVal, step) : undefined;
        setOrClearTarget(next, propKey, val);
      }
      return next;
    });
  };

  const balanceDisabled =
    !wasmBridge ||
    !onApplyBalancedMain ||
    isRecipeEmpty(main) ||
    balanceTargets.length === 0 ||
    hasErrors;

  const balanceTitle = balanceError
    ? `Balance failed: ${balanceError}`
    : hasErrors
      ? `Fix ${errorCount === 1 ? "the error" : `${errorCount} errors`} to balance`
      : balanceTargets.length === 0
        ? "Set at least one composition target to balance"
        : "Balance the recipe to meet current targets";

  const nonEmptyRefs = refs.filter((r) => !isRecipeEmpty(r));

  return (
    <div className="flex h-full flex-col">
      <div className="toolbar">
        {toolbarPrefix}
        <KeyFilterSelect
          supportedKeyFilters={supportedKeyFilters}
          keyFilterState={propsFilterState}
          selectedKeysState={selectedPropsState}
          getKeys={getMixScopePropKeys}
          key_as_med_str={prop_key_as_med_str}
          orderKeys={orderKeys}
        />
        {(wasmBridge !== undefined || nonEmptyRefs.length > 0) && (
          <div className="ml-auto flex shrink-0 items-center gap-1 pr-0.5">
            {(issues.length > 0 || balanceError !== undefined) && (
              <WatcherIssues issues={issues} extraError={balanceError} />
            )}
            {nonEmptyRefs.map((ref) => {
              const letter = ref.id.replace(/^Ref\s*/, "").trim() || ref.id;
              const hasAnyFillable = enabledProps.some((k) =>
                isUsableNumber(getDisplayValue(k, ref)),
              );
              return (
                <button
                  key={ref.id}
                  className="action-button flex items-center px-1"
                  onClick={() => onFillTargetsFromRef(ref)}
                  disabled={enabledProps.length === 0 || !hasAnyFillable}
                  title={`Fill targets for all watched properties from ${ref.id}`}
                  data-testid={`watchers-fill-all-${ref.id}`}
                >
                  <ArrowDown size={COMPONENT_ACTION_ICON_SIZE - 8} />
                  <span className="pr-0.5 text-sm font-semibold">{letter}</span>
                </button>
              );
            })}
            {wasmBridge !== undefined && onApplyBalancedMain !== undefined && (
              <button
                className={`btn-primary mr-1 px-2 py-0.5 ${
                  balanceError ? "issue-border-error border" : ""
                }`}
                onClick={onBalance}
                disabled={balanceDisabled}
                title={balanceTitle}
                data-testid="watchers-balance-button"
              >
                Balance
              </button>
            )}
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <WatchersGrid
          propKeys={enabledProps}
          main={main}
          refs={refs}
          targets={targets}
          priorities={priorities}
          issuesByKey={issuesByKey}
          removable={removable}
          onTargetChange={onTargetChange}
          onPriorityChange={onPriorityChange}
          onRemove={onRemove}
        />
      </div>
    </div>
  );
}
