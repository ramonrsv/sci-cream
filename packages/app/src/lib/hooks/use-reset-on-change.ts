"use client";

import { type Dispatch, type SetStateAction, useCallback } from "react";

import { useRetainedState } from "@/lib/hooks/use-retained-state";

/**
 * Like `useState`, but resets to `resetValue` whenever `resetKey` changes between renders.
 *
 * The reset happens during render (React's "adjust state when a prop changes" pattern) rather than
 * in an effect, so the reset value is returned in the same render — no intermediate frame on the
 * stale value, and no flash. `resetKey` is compared by reference (`!==`); pass a primitive derived
 * from the identity you want to reset on.
 *
 * With a `retainKey`, the value is retained across navigation together with its `resetKey` (see
 * `useRetainedState`), so a remount restores it only while `resetKey` still matches.
 */
export function useResetOnChange<T>(
  resetKey: unknown,
  resetValue: T,
  retainKey?: string,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useRetainedState(retainKey, { resetKey, value: resetValue });

  const setValue = useCallback<Dispatch<SetStateAction<T>>>(
    (action) =>
      setState((prev) => ({
        resetKey: prev.resetKey,
        value: action instanceof Function ? action(prev.value) : action,
      })),
    [setState],
  );

  if (state.resetKey !== resetKey) {
    setState({ resetKey, value: resetValue });
    return [resetValue, setValue];
  }
  return [state.value, setValue];
}
