"use client";

import { useState } from "react";
import { STATE_VAL } from "../util";

export enum QtyToggle {
  /// The raw composition value as stored in the Ingredient, independent of quantity
  Composition = "Composition",
  /// The quantity in grams based on the ingredient quantity in the recipe
  Quantity = "Quantity (g)",
  /// The percentage of the mix based on the ingredient quantity and total mix quantity
  Percentage = "Quantity (%)",
}

export enum KeyFilter {
  Auto = "Auto",
  All = "All",
  Custom = "Custom",
}

export function getEnabledKeys<Key>(
  keyFilterState: [KeyFilter, React.Dispatch<React.SetStateAction<KeyFilter>>],
  selectedKeysState: [Set<Key>, React.Dispatch<React.SetStateAction<Set<Key>>>],
  getKeys: () => Key[],
  isKeyEmpty: (key: Key) => boolean
): Key[] {
  const isKeySelected = (key: Key) => {
    return selectedKeysState[STATE_VAL].has(key);
  };

  switch (keyFilterState[STATE_VAL]) {
    case KeyFilter.All:
      return getKeys();
    case KeyFilter.Auto:
      return getKeys().filter((key) => !isKeyEmpty(key));
    case KeyFilter.Custom:
      return getKeys().filter((key) => isKeySelected(key));
  }
}

export function KeySelection<Key>({
  supportedQtyToggles,
  qtyToggleState,
  keyFilterState,
  selectedKeysState,
  getKeys,
  key_as_med_str_js,
}: {
  supportedQtyToggles: QtyToggle[];
  qtyToggleState: [QtyToggle, React.Dispatch<React.SetStateAction<QtyToggle>>];
  keyFilterState: [KeyFilter, React.Dispatch<React.SetStateAction<KeyFilter>>];
  selectedKeysState: [Set<Key>, React.Dispatch<React.SetStateAction<Set<Key>>>];
  getKeys: () => Key[];
  key_as_med_str_js: (key: Key) => string;
}) {
  const [qtyToggle, setQtyToggle] = qtyToggleState;
  const [keyFilter, setKeyFilter] = keyFilterState;
  const [selectedKeys, setSelectedKeys] = selectedKeysState;

  const [keySelectVisible, setKeySelectVisible] = useState<boolean>(false);

  const isKeySelected = (key: Key) => {
    return selectedKeys.has(key);
  };

  const updateSelectedKey = (key: Key) => {
    const newSet = new Set(selectedKeys);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedKeys(newSet);
  };

  return (
    <div>
      <select
        className="border-gray-400 border text-gray-900 text-sm"
        value={qtyToggle}
        onChange={(e) => setQtyToggle(e.target.value as QtyToggle)}
      >
        {supportedQtyToggles.map((qt) => (
          <option key={qt} value={qt}>
            {qt}
          </option>
        ))}
      </select>
      <select
        className="ml-2 border-gray-400 border text-gray-900 text-sm"
        value={keyFilter}
        onChange={(e) => {
          setKeyFilter(e.target.value as KeyFilter);
          if (e.target.value === KeyFilter.Custom) {
            setKeySelectVisible(true);
          }
        }}
      >
        <option value={KeyFilter.Auto}>{KeyFilter.Auto}</option>
        <option value={KeyFilter.All}>{KeyFilter.All}</option>
        <option value={KeyFilter.Custom}>{KeyFilter.Custom}</option>
      </select>
      {keySelectVisible && (
        <div className="popup top-0 left-47 w-fit pl-1 pr-2 whitespace-nowrap">
          <button onClick={() => setKeySelectVisible(false)}>Done</button>
          <ul>
            {getKeys().map((key) => (
              <li key={String(key)}>
                <input
                  type="checkbox"
                  checked={isKeySelected(key)}
                  onChange={() => updateSelectedKey(key)}
                />
                {" " + key_as_med_str_js(key)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
