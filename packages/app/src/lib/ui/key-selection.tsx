"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  NonZero = "NonZero",
  All = "All",
  Custom = "Custom",
}

export function getEnabledKeys<Key>(
  keyFilterState: [KeyFilter, React.Dispatch<React.SetStateAction<KeyFilter>>],
  selectedKeysState: [Set<Key>, React.Dispatch<React.SetStateAction<Set<Key>>>],
  getKeys: () => Key[],
  isKeyEmpty: (key: Key) => boolean,
  autoHeuristic: (key: Key) => boolean,
): Key[] {
  const isKeySelected = (key: Key) => {
    return selectedKeysState[STATE_VAL].has(key);
  };

  switch (keyFilterState[STATE_VAL]) {
    case KeyFilter.All:
      return getKeys();
    case KeyFilter.Auto:
      return getKeys().filter((key) => autoHeuristic(key));
    case KeyFilter.NonZero:
      return getKeys().filter((key) => !isKeyEmpty(key));
    case KeyFilter.Custom:
      return getKeys().filter((key) => isKeySelected(key));
  }
}

export function KeySelection<Key>({
  qtyToggleComponent,
  keyFilterState,
  selectedKeysState,
  getKeys,
  key_as_med_str_js,
}: {
  qtyToggleComponent?: {
    supportedQtyToggles: QtyToggle[];
    qtyToggleState: [QtyToggle, React.Dispatch<React.SetStateAction<QtyToggle>>];
  };
  keyFilterState: [KeyFilter, React.Dispatch<React.SetStateAction<KeyFilter>>];
  selectedKeysState: [Set<Key>, React.Dispatch<React.SetStateAction<Set<Key>>>];
  getKeys: () => Key[];
  key_as_med_str_js: (key: Key) => string;
}) {
  const supportedQtyToggles = qtyToggleComponent?.supportedQtyToggles;
  const [qtyToggle, setQtyToggle] = qtyToggleComponent?.qtyToggleState ?? [undefined, undefined];
  const hasQtyToggle = supportedQtyToggles !== undefined && qtyToggle !== undefined;

  const [keyFilter, setKeyFilter] = keyFilterState;
  const [selectedKeys, setSelectedKeys] = selectedKeysState;

  const [keySelectVisible, setKeySelectVisible] = useState<boolean>(false);
  const buttonRef = useRef<HTMLSelectElement>(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (keySelectVisible && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopupPosition({
        top: rect.bottom + window.scrollY - 20,
        left: rect.left + window.scrollX + 80,
      });
    }
  }, [keySelectVisible]);

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
    <div id="key-selection">
      {hasQtyToggle && (
        <select
          className="select-input"
          value={qtyToggle}
          onChange={(e) => setQtyToggle(e.target.value as QtyToggle)}
        >
          {supportedQtyToggles.map((qt) => (
            <option key={qt} value={qt} className="table-inner-cell">
              {qt}
            </option>
          ))}
        </select>
      )}
      <select
        ref={buttonRef}
        className={`select-input ${hasQtyToggle ? "ml-2" : ""}`}
        value={keyFilter}
        onChange={(e) => {
          setKeyFilter(e.target.value as KeyFilter);
          if (e.target.value === KeyFilter.Custom) {
            setKeySelectVisible(true);
          }
        }}
      >
        {Object.values(KeyFilter).map((kf) => (
          <option key={kf} value={kf} className="table-inner-cell">
            {kf}
          </option>
        ))}
      </select>
      {keySelectVisible &&
        createPortal(
          <div
            className="popup absolute z-50 w-fit pr-2 pl-1 whitespace-nowrap"
            style={{ top: `${popupPosition.top}px`, left: `${popupPosition.left}px` }}
          >
            <button className="button" onClick={() => setKeySelectVisible(false)}>
              Done
            </button>
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
          </div>,
          document.body,
        )}
    </div>
  );
}
