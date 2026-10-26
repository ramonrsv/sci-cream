"use client";

import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";

/**
 * Values held by {@link useRetainedState}, by key. Owned by a `RetainedStateProvider`; `null` when
 * none is mounted, which makes the hook behave as a plain `useState`.
 */
export const RetainedStateContext = createContext<Map<string, unknown> | null>(null);

/**
 * Drop-in for `useState` whose value outlives the component across client-side navigation, but not
 * a reload: it's kept in memory by the nearest `RetainedStateProvider`, mounted in the root layout.
 *
 * Unlike {@link usePersistedState}, nothing touches `localStorage`, and the retained value seeds
 * the initial state, so a remount renders it on the first frame rather than flashing the default.
 * Hydration-safe: a full page load starts with an empty store, so the server and the first client
 * render both see `defaultValue`.
 *
 * When `key` is `undefined`, or no provider is mounted, behaves as a plain `useState`.
 */
export function useRetainedState<T>(
  key: string | undefined,
  defaultValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const retained = useContext(RetainedStateContext);
  const [value, setValue] = useState<T>(() =>
    key !== undefined && retained?.has(key) ? (retained.get(key) as T) : defaultValue,
  );

  useEffect(() => {
    if (key !== undefined) retained?.set(key, value);
  }, [retained, key, value]);

  return [value, setValue];
}
