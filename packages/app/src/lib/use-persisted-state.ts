"use client";

import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";

import { getLocalStorage, setLocalStorage } from "@/lib/local-storage";

/**
 * Derives a `localStorage` leaf key from a persistence root and a suffix. Returns `undefined` when
 * `root` is `undefined`, making `usePersistedState` behave as plain `useState` with no storage.
 *
 * @example leafKey("properties-panel-view", "qty") // → "properties-panel-view:qty"
 */
export function leafKey(root: string | undefined, suffix: string): string | undefined {
  return root !== undefined ? `${root}:${suffix}` : undefined;
}

/** Options for {@link usePersistedState} */
interface UsePersistedStateOptions<T> {
  /** Serialize `value` before writing to `localStorage`; default is JSON via `setLocalStorage` */
  serialize?: (value: T) => unknown;
  /** Deserialize raw JSON back to `T`; default is a direct cast */
  deserialize?: (raw: unknown) => T;
  /**
   * Validate a deserialized value; when it returns `false` the stored entry is rejected and the
   * hook falls back to `defaultValue`. Use to guard against stale keys after enum/schema changes.
   */
  isValid?: (value: T) => boolean;
}

/**
 * Drop-in for `useState` that persists and restores its value in `localStorage`.
 *
 * Hydration-safe: starts at `defaultValue` on the server (and on the initial client render to
 * prevent a hydration mismatch), then restores the stored value in a mount `useEffect`. A
 * `mountedRef` guard ensures the default is never written to storage before the restore runs —
 * the initial effect run always takes the restore path and skips the write.
 *
 * When `key` is `undefined`, behaves as a plain `useState` with no storage interaction, letting
 * a render site opt out (e.g. tests or ephemeral consumers).
 *
 * Functional updaters (`setState(prev => next)`) are fully supported: React resolves them to the
 * new value, which this hook's write effect sees on the next render and persists.
 */
export function usePersistedState<T>(
  key: string | undefined,
  defaultValue: T,
  options?: UsePersistedStateOptions<T>,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(defaultValue);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      if (key !== undefined) {
        const raw = getLocalStorage<unknown>(key);
        if (raw !== null) {
          const deserialized = options?.deserialize ? options.deserialize(raw) : (raw as T);
          if (!options?.isValid || options.isValid(deserialized)) {
            setValue(deserialized);
          }
        }
      }
      return;
    }
    if (key === undefined) return;
    setLocalStorage(key, options?.serialize ? options.serialize(value) : value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, value]);

  return [value, setValue];
}
