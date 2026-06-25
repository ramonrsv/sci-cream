"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { X, Settings } from "lucide-react";

import { leafKey, usePersistedState } from "@/lib/use-persisted-state";

import { COMPONENT_ACTION_ICON_SIZE } from "@/lib/styles/sizes";
import { Popover, PopoverButton, PopupPanel } from "@/app/_elements/popup";

import { Select, type SelectOption } from "@/app/_elements/selects/select";

/** Controls which subset of keys is shown in composition/property tables and charts */
export enum KeyFilter {
  /// Automatically determine which keys to show based on internal heuristics
  Auto = "Auto",
  /// Show only keys with a non-zero, finite value (excludes zero, NaN, and +/-INF)
  Active = "Active",
  /// Show all keys regardless of value
  All = "All",
  /// Show only keys that the user has manually selected
  Custom = "Custom",
}

/**
 * Return the subset of keys that should be displayed, based on the active `KeyFilter`.
 *
 * - `All` — every key returned by `getKeys`
 * - `Auto` — keys passing `autoHeuristic`
 * - `Active` — keys for which `isKeyEmpty` returns `false`
 * - `Custom` — only keys present in `selectedKeysState`
 */
export function getEnabledKeys<Key>(
  keyFilterState: KeyFilter,
  selectedKeysState: Set<Key>,
  getKeys: () => Key[],
  isKeyEmpty: (key: Key) => boolean,
  autoHeuristic: (key: Key) => boolean,
): Key[] {
  /** Returns `true` when the given key is in the current custom selection */
  const isKeySelected = (key: Key) => {
    return selectedKeysState.has(key);
  };

  switch (keyFilterState) {
    case KeyFilter.All:
      return getKeys();
    case KeyFilter.Auto:
      return getKeys().filter((key) => autoHeuristic(key));
    case KeyFilter.Active:
      return getKeys().filter((key) => !isKeyEmpty(key));
    case KeyFilter.Custom:
      return getKeys().filter((key) => isKeySelected(key));
  }
}

/**
 * Persisted `{ keyFilterState, selectedKeysState, supportedKeyFilters }` for a {@link KeyFilter}.
 *
 * `supportedKeyFilters` constrains which `KeyFilter` values are valid for this site — stored values
 * outside that list are rejected and fall back to `defaultFilter`. Defaults to all `KeyFilter`
 * values when omitted. `defaultFilter` is typed as `Filters[number]` (a compile-time error if it
 * is not in `supportedKeyFilters`), and defaults to the first supported filter.
 *
 * When `persistKey` is `undefined`, both states fall back to plain `useState`.
 * Stored leaf keys: `${persistKey}:filter` and `${persistKey}:selected`.
 *
 * The `isValid` callback rejects stored key sets whose members are no longer in `getKeys()`, so a
 * changed WASM key universe always falls back gracefully to `defaultSelected`.
 */
export function useKeyFilterState<Key, const Filters extends [KeyFilter, ...KeyFilter[]]>(
  persistKey: string | undefined,
  {
    defaultSelected,
    getKeys,
    supportedKeyFilters = Object.values(KeyFilter) as unknown as Filters,
    defaultFilter = supportedKeyFilters[0],
  }: {
    defaultSelected: Set<Key>;
    getKeys: () => Key[];
    supportedKeyFilters?: Filters;
    defaultFilter?: Filters[number];
  },
): {
  keyFilterState: [KeyFilter, Dispatch<SetStateAction<KeyFilter>>];
  selectedKeysState: [Set<Key>, Dispatch<SetStateAction<Set<Key>>>];
  supportedKeyFilters: Filters;
} {
  const keyFilterState = usePersistedState<KeyFilter>(
    leafKey(persistKey, "filter"),
    defaultFilter,
    { isValid: (v) => (supportedKeyFilters as KeyFilter[]).includes(v) },
  );

  const selectedKeysState = usePersistedState<Set<Key>>(
    leafKey(persistKey, "selected"),
    defaultSelected,
    {
      serialize: (set) => Array.from(set),
      deserialize: (raw) => new Set(Array.isArray(raw) ? (raw as Key[]) : []),
      isValid: (set) => {
        const validKeys = new Set(getKeys());
        return [...set].every((k) => validKeys.has(k));
      },
    },
  );

  return { keyFilterState, selectedKeysState, supportedKeyFilters };
}

/** Select element for choosing a `KeyFilter` mode, with an optional settings popup for `Custom` */
export function KeyFilterSelect<Key>({
  supportedKeyFilters = Object.values(KeyFilter),
  keyFilterState,
  selectedKeysState,
  getKeys,
  key_as_med_str,
  orderKeys,
}: {
  supportedKeyFilters?: KeyFilter[];
  keyFilterState: [KeyFilter, React.Dispatch<React.SetStateAction<KeyFilter>>];
  selectedKeysState: [Set<Key>, React.Dispatch<React.SetStateAction<Set<Key>>>];
  getKeys: () => Key[];
  key_as_med_str: (key: Key) => string;
  /**
   * Optional reordering of the customize list into hierarchy order, indenting members by `depth`
   * and emphasizing roll-ups. When absent, the list renders flat in `getKeys` order.
   */
  orderKeys?: (keys: Key[]) => { key: Key; depth: number; isRollup: boolean }[];
}) {
  const [keyFilter, setKeyFilter] = keyFilterState;
  const [selectedKeys, setSelectedKeys] = selectedKeysState;
  const [allKeysSelected, setAllKeysSelected] = useState<boolean>(false);

  /** Returns `true` when the given key is in the current custom selection */
  const isKeySelected = (key: Key) => {
    return selectedKeys.has(key);
  };

  /** Toggle a single key in/out of the custom selection; clears "all selected" flag on removal */
  const updateSelectedKey = (key: Key) => {
    const newSet = new Set(selectedKeys);
    if (newSet.has(key)) {
      newSet.delete(key);
      setAllKeysSelected(false);
    } else {
      newSet.add(key);
    }
    setSelectedKeys(newSet);
  };

  /** Toggle "All Properties" checkbox: selects all keys when enabling, clears all when disabling */
  const updateAllKeysSelected = () => {
    const newAllKeysSelected = !allKeysSelected;
    setAllKeysSelected(newAllKeysSelected);

    if (newAllKeysSelected) {
      setSelectedKeys(new Set(getKeys()));
    } else {
      setSelectedKeys(new Set());
    }
  };

  const options: SelectOption<KeyFilter>[] = supportedKeyFilters.map((kf) => ({
    value: kf,
    label: kf,
  }));

  return (
    <div id="key-filter-select">
      <div className="flex items-center">
        <Select value={keyFilter} onChange={setKeyFilter} options={options} />
        {keyFilter === KeyFilter.Custom && (
          <Popover>
            <PopoverButton
              id="customize-keys-button"
              className="action-button ml-0.5 px-0.5 py-0.5"
              title="Customize properties"
            >
              <Settings size={COMPONENT_ACTION_ICON_SIZE - 5} />
            </PopoverButton>
            <PopupPanel
              anchor={{ to: "right start", gap: 5, padding: 5 }}
              className="h-100 w-fit overflow-x-auto pr-2 pl-1 whitespace-nowrap"
            >
              {({ close }) => (
                <>
                  <button
                    className="action-button sticky top-0 z-10 float-right -mr-1 pt-px"
                    onClick={() => close()}
                  >
                    <X size={COMPONENT_ACTION_ICON_SIZE} />
                  </button>
                  <ul className="bg-inherit">
                    <li
                      key="All"
                      className="border-brd sticky top-0 min-w-33 border-b bg-inherit py-0.5 font-semibold"
                    >
                      <input
                        id="all-properties-checkbox"
                        type="checkbox"
                        checked={allKeysSelected}
                        onChange={updateAllKeysSelected}
                      />
                      {" All Properties"}
                    </li>
                    {(orderKeys
                      ? orderKeys(getKeys())
                      : getKeys().map((key) => ({ key, depth: 0, isRollup: false }))
                    ).map(({ key, depth, isRollup }, i) => (
                      <li
                        key={`${String(key)}-${i}`}
                        className={isRollup ? "font-semibold" : undefined}
                        style={depth > 0 ? { paddingLeft: `${depth * 0.75}rem` } : undefined}
                      >
                        <input
                          type="checkbox"
                          checked={isKeySelected(key)}
                          onChange={() => updateSelectedKey(key)}
                        />
                        {" " + key_as_med_str(key)}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </PopupPanel>
          </Popover>
        )}
      </div>
    </div>
  );
}
