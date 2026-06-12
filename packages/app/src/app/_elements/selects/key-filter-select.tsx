"use client";

import { useState } from "react";
import { X, Settings } from "lucide-react";

import { COMPONENT_ACTION_ICON_SIZE } from "@/lib/styles/sizes";
import { Popover, PopoverButton, PopupPanel } from "@/app/_elements/popup";

import { Select, type SelectOption } from "./select";

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

/** Select element for choosing a `KeyFilter` mode, with an optional settings popup for `Custom` */
export function KeyFilterSelect<Key>({
  supportedKeyFilters = Object.values(KeyFilter),
  keyFilterState,
  selectedKeysState,
  getKeys,
  key_as_med_str,
}: {
  supportedKeyFilters?: KeyFilter[];
  keyFilterState: [KeyFilter, React.Dispatch<React.SetStateAction<KeyFilter>>];
  selectedKeysState: [Set<Key>, React.Dispatch<React.SetStateAction<Set<Key>>>];
  getKeys: () => Key[];
  key_as_med_str: (key: Key) => string;
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
              className="action-button ml-0.5 px-1 py-0.75"
              title="Customize properties"
            >
              <Settings size={COMPONENT_ACTION_ICON_SIZE - 3} />
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
                      className="border-brd-lt dark:border-brd-dk sticky top-0 min-w-33 border-b bg-inherit py-0.5 font-semibold"
                    >
                      <input
                        id="all-properties-checkbox"
                        type="checkbox"
                        checked={allKeysSelected}
                        onChange={updateAllKeysSelected}
                      />
                      {" All Properties"}
                    </li>
                    {getKeys().map((key) => (
                      <li key={String(key)}>
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
