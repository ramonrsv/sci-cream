"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Settings } from "lucide-react";

import { COMPONENT_ACTION_ICON_SIZE } from "@/app/page";
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
  /// Automatically determine which keys to show based on internal heuristics
  Auto = "Auto",
  /// Show only keys whose values are non-zero for at least one ingredient in at least one recipe
  NonZero = "Non-Zero",
  /// Show all keys regardless of value
  All = "All",
  /// Show only keys that the user has manually selected
  Custom = "Custom",
}

/** Gets short labels for the QtyToggle options to show in the UI */
export function qtyToggleToShortStr(qt: QtyToggle): string {
  switch (qt) {
    case QtyToggle.Composition:
      return "Comp.";
    case QtyToggle.Quantity:
      return "Qty (g)";
    case QtyToggle.Percentage:
      return "Qty (%)";
    default:
      throw new Error("Unsupported QtyToggle value");
  }
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
  key_as_med_str,
}: {
  qtyToggleComponent?: {
    supportedQtyToggles: QtyToggle[];
    qtyToggleState: [QtyToggle, React.Dispatch<React.SetStateAction<QtyToggle>>];
  };
  keyFilterState: [KeyFilter, React.Dispatch<React.SetStateAction<KeyFilter>>];
  selectedKeysState: [Set<Key>, React.Dispatch<React.SetStateAction<Set<Key>>>];
  getKeys: () => Key[];
  key_as_med_str: (key: Key) => string;
}) {
  const supportedQtyToggles = qtyToggleComponent?.supportedQtyToggles;
  const [qtyToggle, setQtyToggle] = qtyToggleComponent?.qtyToggleState ?? [undefined, undefined];
  const hasQtyToggle = supportedQtyToggles !== undefined && qtyToggle !== undefined;

  const [keyFilter, setKeyFilter] = keyFilterState;
  const [selectedKeys, setSelectedKeys] = selectedKeysState;
  const [allKeysSelected, setAllKeysSelected] = useState<boolean>(false);

  const [keySelectVisible, setKeySelectVisible] = useState<boolean>(false);
  const buttonRef = useRef<HTMLSelectElement>(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (keySelectVisible && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopupPosition({ top: rect.top + window.scrollY, right: rect.right + window.scrollX });
    }
  }, [keySelectVisible]);

  const isKeySelected = (key: Key) => {
    return selectedKeys.has(key);
  };

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

  const updateAllKeysSelected = () => {
    const newAllKeysSelected = !allKeysSelected;
    setAllKeysSelected(newAllKeysSelected);

    if (newAllKeysSelected) {
      setSelectedKeys(new Set(getKeys()));
    } else {
      setSelectedKeys(new Set());
    }
  };

  return (
    <div id="key-selection">
      <div className="flex items-center">
        {hasQtyToggle && (
          <select
            id={"qty-toggle-select"}
            className="select-input"
            value={qtyToggle}
            onChange={(e) => setQtyToggle(e.target.value as QtyToggle)}
          >
            {supportedQtyToggles.map((qt) => (
              <option key={qt} value={qt} className="table-inner-cell">
                {qtyToggleToShortStr(qt)}
              </option>
            ))}
          </select>
        )}
        <select
          ref={buttonRef}
          id={"key-filter-select"}
          className={`select-input ${hasQtyToggle ? "ml-2" : ""}`}
          value={keyFilter}
          onChange={(e) => setKeyFilter(e.target.value as KeyFilter)}
        >
          {Object.values(KeyFilter).map((kf) => (
            <option key={kf} value={kf} className="table-inner-cell">
              {kf}
            </option>
          ))}
        </select>
        {keyFilter === KeyFilter.Custom && (
          <button
            className="action-button ml-0.5 px-1 py-0.75"
            onClick={() => setKeySelectVisible(true)}
            title="Customize properties"
          >
            <Settings size={COMPONENT_ACTION_ICON_SIZE - 3} />
          </button>
        )}
      </div>
      {keySelectVisible &&
        popupPosition.top !== 0 &&
        popupPosition.right !== 0 &&
        createPortal(
          <div
            className="popup absolute z-50 h-100 w-fit overflow-x-auto pr-2 pl-1 whitespace-nowrap"
            style={{ top: `${popupPosition.top}px`, left: `${popupPosition.right + 5}px` }}
          >
            <button
              className="action-button sticky top-0 z-10 float-right -mr-1 pt-px"
              onClick={() => setKeySelectVisible(false)}
            >
              <X size={COMPONENT_ACTION_ICON_SIZE} />
            </button>
            <ul className="bg-inherit">
              <li
                key="All"
                className="border-brd-lt dark:border-brd-dk sticky top-0 min-w-33 border-b bg-inherit py-0.5 font-semibold"
              >
                <input type="checkbox" checked={allKeysSelected} onChange={updateAllKeysSelected} />
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
          </div>,
          document.body,
        )}
    </div>
  );
}
