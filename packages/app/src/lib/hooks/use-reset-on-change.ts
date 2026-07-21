"use client";

import { type Dispatch, type SetStateAction, useState } from "react";

/**
 * Like `useState`, but resets to `resetValue` whenever `resetKey` changes between renders.
 *
 * The reset happens during render (React's "adjust state when a prop changes" pattern) rather than
 * in an effect, so the reset value is returned in the same render — no intermediate frame on the
 * stale value, and no flash. `resetKey` is compared by reference (`!==`); pass a primitive derived
 * from the identity you want to reset on.
 */
export function useResetOnChange<T>(
  resetKey: unknown,
  resetValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(resetValue);
  const [prevKey, setPrevKey] = useState(resetKey);

  if (prevKey !== resetKey) {
    setPrevKey(resetKey);
    setValue(resetValue);
    return [resetValue, setValue];
  }
  return [value, setValue];
}
