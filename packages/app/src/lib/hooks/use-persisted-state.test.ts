import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { usePersistedState } from "./use-persisted-state";

const KEY = "test-key";

describe("usePersistedState", () => {
  beforeEach(() => localStorage.clear());

  // ---- Initial value & restore ------------------------------------------------------------

  it("starts at defaultValue when storage is empty", () => {
    const { result } = renderHook(() => usePersistedState(KEY, 42));
    expect(result.current[0]).toBe(42);
  });

  it("restores a stored number on mount", async () => {
    localStorage.setItem(KEY, JSON.stringify(7));
    const { result } = renderHook(() => usePersistedState(KEY, 42));
    // restore is async (useEffect)
    await act(async () => {});
    expect(result.current[0]).toBe(7);
  });

  it("restores a stored string on mount", async () => {
    localStorage.setItem(KEY, JSON.stringify("hello"));
    const { result } = renderHook(() => usePersistedState(KEY, "world"));
    await act(async () => {});
    expect(result.current[0]).toBe("hello");
  });

  // ---- key === undefined passthrough ------------------------------------------------------

  it("never reads storage when key is undefined", async () => {
    localStorage.setItem(KEY, JSON.stringify(99));
    const { result } = renderHook(() => usePersistedState<number>(undefined, 1));
    await act(async () => {});
    expect(result.current[0]).toBe(1); // still default
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify(99)); // untouched
  });

  it("never writes storage when key is undefined", async () => {
    const { result } = renderHook(() => usePersistedState<number>(undefined, 0));
    await act(async () => {});
    act(() => result.current[1](5));
    await act(async () => {});
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  // ---- Guard: default not written before restore ------------------------------------------

  it("does not write defaultValue to storage on initial mount", async () => {
    const { result } = renderHook(() => usePersistedState(KEY, 99));
    await act(async () => {});
    // No stored value existed; default should NOT have been written
    expect(result.current[0]).toBe(99);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("does not overwrite an existing stored value with defaultValue on mount", async () => {
    localStorage.setItem(KEY, JSON.stringify(7));
    renderHook(() => usePersistedState(KEY, 42));
    // After synchronous render the stored value must not have been clobbered
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify(7));
  });

  // ---- Write on value change --------------------------------------------------------------

  it("persists a value change to storage", async () => {
    const { result } = renderHook(() => usePersistedState(KEY, 0));
    await act(async () => {});
    act(() => result.current[1](99));
    await act(async () => {});
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify(99));
    expect(result.current[0]).toBe(99);
  });

  it("persists a functional updater's resolved value", async () => {
    localStorage.setItem(KEY, JSON.stringify(10));
    const { result } = renderHook(() => usePersistedState(KEY, 0));
    await act(async () => {});
    expect(result.current[0]).toBe(10);
    act(() => result.current[1]((prev) => prev + 5));
    await act(async () => {});
    expect(result.current[0]).toBe(15);
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify(15));
  });

  // ---- isValid guard ----------------------------------------------------------------------

  it("falls back to defaultValue when isValid rejects the stored entry", async () => {
    localStorage.setItem(KEY, JSON.stringify("bad"));
    const { result } = renderHook(() =>
      usePersistedState(KEY, 0, { isValid: (v) => typeof v === "number" }),
    );
    await act(async () => {});
    expect(result.current[0]).toBe(0);
  });

  it("accepts a stored value when isValid passes", async () => {
    localStorage.setItem(KEY, JSON.stringify(5));
    const { result } = renderHook(() =>
      usePersistedState(KEY, 0, { isValid: (v) => typeof v === "number" }),
    );
    await act(async () => {});
    expect(result.current[0]).toBe(5);
  });

  // ---- serialize / deserialize round-trips -----------------------------------------------

  it("round-trips a Set<number> via serialize/deserialize", async () => {
    const stored = new Set([1, 2, 3]);
    localStorage.setItem(KEY, JSON.stringify(Array.from(stored)));

    const { result } = renderHook(() =>
      usePersistedState<Set<number>>(KEY, new Set(), {
        serialize: (s) => Array.from(s),
        deserialize: (raw) => new Set(raw as number[]),
      }),
    );
    await act(async () => {});
    expect(result.current[0]).toEqual(new Set([1, 2, 3]));

    act(() => result.current[1](new Set([9])));
    await act(async () => {});
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual([9]);
  });

  it("round-trips an enum value", async () => {
    enum Color {
      Red = "Red",
      Blue = "Blue",
    }
    localStorage.setItem(KEY, JSON.stringify(Color.Blue));
    const { result } = renderHook(() =>
      usePersistedState(KEY, Color.Red, {
        isValid: (v) => Object.values(Color).includes(v as Color),
      }),
    );
    await act(async () => {});
    expect(result.current[0]).toBe(Color.Blue);
  });

  it("round-trips a number value", async () => {
    localStorage.setItem(KEY, JSON.stringify(3));
    const { result } = renderHook(() => usePersistedState(KEY, 0));
    await act(async () => {});
    expect(result.current[0]).toBe(3);
    act(() => result.current[1](7));
    await act(async () => {});
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify(7));
  });
});
