"use client";

import { ReactNode, useEffect, useState } from "react";
import { ArrowDown, X } from "lucide-react";

import { Recipe, RecipeSummary, isRecipeEmpty, makeLightRecipe } from "@/lib/recipe";
import {
  KeyFilter,
  KeyFilterSelect,
  getEnabledKeys,
} from "@/app/_elements/selects/key-filter-select";
import { QtyToggle } from "@/app/_elements/selects/qty-toggle-select";
import { applyQtyToggle, formatCompositionValue } from "@/lib/comp-value-format";
import { getAcceptablePropertyRange, isPropKeyQuantity } from "@/lib/sci-cream/sci-cream";
import { Color, colorVar, colorVarWithAlpha, getRangeColor } from "@/lib/styles/colors";
import { getLocalStorage, setLocalStorage, STORAGE_KEYS } from "@/lib/local-storage";
import { COMPONENT_ACTION_ICON_SIZE } from "@/lib/styles/sizes";
import { STATE_VAL, roundToStep, standardInputStepByPercent, verify } from "@/lib/util";

import {
  PropKey,
  getPropKeys,
  getMixProperty,
  prop_key_as_med_str,
  compToPropKey,
  CompKey,
  fpdToPropKey,
  FpdKey,
  isCompKey,
  Bridge as WasmBridge,
} from "@workspace/sci-cream";

/** Map of `PropKey` to user-entered target value; sparse, only set entries are tracked */
export type TargetsMap = Partial<Record<PropKey, number>>;

/** Default set of property keys shown when the Custom key filter is first initialized */
export const DEFAULT_SELECTED_PROPERTIES: Set<PropKey> = new Set([
  compToPropKey(CompKey.MilkFat),
  compToPropKey(CompKey.TotalFats),
  compToPropKey(CompKey.MSNF),
  compToPropKey(CompKey.TotalSolids),
  compToPropKey(CompKey.Water),
  compToPropKey(CompKey.TotalSugars),
  compToPropKey(CompKey.StabilizersPerWater),
  compToPropKey(CompKey.POD),
  compToPropKey(CompKey.AbsPAC),
  fpdToPropKey(FpdKey.ServingTemp),
] as PropKey[]);

/** Type predicate: `val` is a defined, non-NaN number (i.e. a real computed numeric result). */
function isUsableNumber(val: number | undefined): val is number {
  return val !== undefined && !Number.isNaN(val);
}

/** Format a numeric delta as a signed string (e.g. `+0.58`, `−0.47`); returns "" for NaN/undef */
function formatDelta(delta: number | undefined): string {
  if (!isUsableNumber(delta)) return "";

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
  if (!isUsableNumber(delta) || delta === 0) return undefined;
  return colorVar(delta > 0 ? Color.GraphGreen : Color.GraphRedDull);
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
 * Filter a `TargetsMap` to CompKey-derived entries that are currently watched (in `enabledSet`),
 * as `[variantName, value][]` expected by `Bridge.balance_recipe` for serde <-> JsValue boundary.
 *
 * A CompKey-derived `PropKey` is literally the CompKey variant name string (see `compToPropKey`),
 * so the propKey passes through as the serde tag with no conversion needed. Restricting to
 * `enabledSet` keeps the balancer aligned with what the user sees — targets persisted in
 * localStorage but filtered out of view aren't silently applied.
 */
function targetsToBalanceArgs(targets: TargetsMap, enabledSet: Set<PropKey>): [string, number][] {
  return Object.entries(targets)
    .filter(
      ([propKey, val]) =>
        isUsableNumber(val) && isCompKey(propKey as PropKey) && enabledSet.has(propKey as PropKey),
    )
    .map(([propKey, val]) => [propKey, val as number]);
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
  const mainHasValue = isUsableNumber(mainValue);

  const headerColor: Color =
    range && mainHasValue ? getRangeColor(mainValue, range) : Color.GraphGray;

  const targetStep = getTargetStep(target, mainValue);

  const titleBackgroundOpacity = 0.6;
  const refRowOpacity = 0.8;

  return (
    <div
      className="border-brd-lt dark:border-brd-dk flex flex-col overflow-hidden rounded-md border text-sm"
      data-testid={`watcher-card-${String(propKey)}`}
      data-prop-key={String(propKey)}
    >
      {/* Header: property name + color-coded background + remove button */}
      <div
        className="flex items-center justify-between px-1.5 py-0.5 font-semibold"
        style={{ backgroundColor: colorVarWithAlpha(headerColor, titleBackgroundOpacity) }}
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
            {/* Show a placeholder whitespace value to keep layouts consistent */}
            {formatCompositionValue(mainValue) || "\u00A0"}
          </span>
          {range && (
            <span className="text-secondary text-[11px]" title="Acceptable range">
              {formatRange(range)}
            </span>
          )}
        </div>

        {/* Reference rows: letter doubles as a fill-target button, then value + delta. */}
        {refs
          .filter((ref) => !isRecipeEmpty(ref))
          .map((ref) => {
            // Always render a row for non-empty ref recipes, to keep vertical layout consistent,
            // but hide the content when the mix properties don't have a value for the watched key.

            const refValue = getDisplayValue(propKey, ref);
            const refHasValue = isUsableNumber(refValue);
            const delta = mainHasValue && refHasValue ? mainValue - refValue : undefined;
            const refLetter = ref.id.replace(/^Ref\s*/, "").trim() || ref.id;

            return (
              <div
                key={ref.id}
                className="flex items-center justify-between"
                style={{ opacity: refRowOpacity, visibility: refHasValue ? "visible" : "hidden" }}
                title={`${ref.id} value (delta from current)`}
                data-testid={`watcher-card-${String(propKey)}-ref-${ref.id}`}
                aria-hidden={!refHasValue}
              >
                <button
                  className="action-button flex items-center px-0.5 py-0"
                  onClick={() => onTargetChange(roundToStep(refValue!, targetStep))}
                  title={`Fill target from ${ref.id}`}
                  data-testid={`watcher-card-${String(propKey)}-fill-${ref.id}`}
                  style={{ visibility: refHasValue ? "visible" : "hidden" }}
                >
                  <ArrowDown size={COMPONENT_ACTION_ICON_SIZE - 10} />
                  <span className="text-[11px] font-semibold">{refLetter}</span>
                </button>
                <span className="comp-val">{formatCompositionValue(refValue)}</span>
                <span
                  className="comp-val w-12 text-right text-[11px]"
                  style={{ color: getDeltaColor(delta) }}
                  data-testid={`watcher-card-${String(propKey)}-ref-${ref.id}-delta`}
                >
                  {formatDelta(delta || undefined)}
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
              data-testid={`watcher-card-${String(propKey)}-target-delta`}
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
 * The toolbar's right-side action group has a Balance button (runs the WASM balancer using
 * watched CompKey-derived targets, then calls `onApplyBalancedMain`) and one Fill-from-Ref
 * button per non-empty reference (fills currently-watched targets from that reference's values).
 * Both are inert without `wasmBridge` and `onApplyBalancedMain`, so bare renders stay read-only.
 */
export function WatchersView({
  main,
  refs = [],
  toolbarPrefix,
  defaultSelected = DEFAULT_SELECTED_PROPERTIES,
  wasmBridge,
  onApplyBalancedMain,
}: {
  main: Recipe;
  refs?: RecipeSummary[];
  toolbarPrefix?: ReactNode;
  defaultSelected?: Set<PropKey>;
  wasmBridge?: WasmBridge;
  onApplyBalancedMain?: (balanced: [string, number][]) => void;
}) {
  const propsFilterState = useState<KeyFilter>(KeyFilter.Auto);
  const selectedPropsState = useState<Set<PropKey>>(defaultSelected);
  const [, setSelectedProps] = selectedPropsState;
  const [targets, setTargets] = useState<TargetsMap>({});
  const [balanceError, setBalanceError] = useState<string | undefined>(undefined);

  // Hydrate selection + targets from localStorage on mount (client-only, after SSR pass)
  useEffect(() => {
    const stored = getLocalStorage<PropKey[]>(STORAGE_KEYS.watcherSelectedProps);
    if (stored) setSelectedProps(new Set(stored));

    const storedTargets = getLocalStorage<TargetsMap>(STORAGE_KEYS.watcherTargets);
    if (storedTargets) setTargets(storedTargets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist selection to localStorage on change
  useEffect(() => {
    setLocalStorage(STORAGE_KEYS.watcherSelectedProps, Array.from(selectedPropsState[STATE_VAL]));
  }, [selectedPropsState]);

  // Persist targets to localStorage on change
  useEffect(() => {
    setLocalStorage(STORAGE_KEYS.watcherTargets, targets);
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
      setOrClearTarget(next, propKey, val);
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

  const enabledProps = getEnabledProps();
  const balanceTargets = targetsToBalanceArgs(targets, new Set(enabledProps));

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
      const balanced = wasmBridge.balance_recipe(lightRecipe, balanceTargets) as [string, number][];

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
    !wasmBridge || !onApplyBalancedMain || isRecipeEmpty(main) || balanceTargets.length === 0;

  const balanceTitle = balanceError
    ? `Balance failed: ${balanceError}`
    : balanceTargets.length === 0
      ? "Set at least one composition target to balance"
      : "Balance the recipe to meet current targets";

  const nonEmptyRefs = refs.filter((r) => !isRecipeEmpty(r));

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
        {(wasmBridge !== undefined || nonEmptyRefs.length > 0) && (
          <div className="ml-auto flex shrink-0 items-center">
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
                className={`action-button mr-1 px-1.5 py-0.5 text-sm font-semibold ${
                  balanceError ? "border-rd-lt dark:border-rd-dk border" : ""
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
      <div className="flex h-[calc(100%-33px)] flex-col">
        <div className="flex-1 overflow-y-auto">
          <WatchersGrid
            propKeys={enabledProps}
            main={main}
            refs={refs}
            targets={targets}
            onTargetChange={onTargetChange}
            onRemove={onRemove}
          />
        </div>
      </div>
    </>
  );
}
