"use client";

import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useCallback,
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
 * Drop-in for `useState` whose value outlives the component across client-side navigation but not
 * a reload, kept in memory by the `RetainedStateProvider` in the root layout.
 *
 * Unlike {@link usePersistedState}, the retained value seeds the initial state, so a remount shows
 * it on the first frame rather than flashing the default. That is hydration-safe: a page load
 * starts with an empty store, so the server and the first client render both see `defaultValue`.
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

/**
 * Returns a function that sets the value retained under a key, for handing state to a route before
 * navigating there. It writes synchronously, so the value is in place when that route mounts.
 *
 * Only a {@link useRetainedState} that mounts afterwards picks the value up; one already mounted
 * keeps its own state. A no-op when no provider is mounted.
 */
export function useRetainedStateSetter(): (key: string, value: unknown) => void {
  const retained = useContext(RetainedStateContext);

  return useCallback(
    (key, value) => {
      retained?.set(key, value);
    },
    [retained],
  );
}
