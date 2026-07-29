import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useChecklistState } from "./use-checklist-state";

const KEY_A = "batch-a";
const KEY_B = "batch-b";

describe("useChecklistState", () => {
  beforeEach(() => localStorage.clear());

  // ---- Initial value & restore ------------------------------------------------------------

  it("starts with an empty set when storage is empty", () => {
    const { result } = renderHook(() => useChecklistState(KEY_A));
    expect(result.current[0]).toEqual(new Set());
  });

  it("restores a stored set on mount", async () => {
    localStorage.setItem(KEY_A, JSON.stringify(["r1:fat", "r2:sugar"]));
    const { result } = renderHook(() => useChecklistState(KEY_A));
    // restore is async (useEffect)
    await act(async () => {});
    expect(result.current[0]).toEqual(new Set(["r1:fat", "r2:sugar"]));
  });

  // ---- Re-read on key change --------------------------------------------------------------

  it("re-reads storage when the key (batch) changes", async () => {
    localStorage.setItem(KEY_A, JSON.stringify(["a-cell"]));
    localStorage.setItem(KEY_B, JSON.stringify(["b-cell"]));

    const { result, rerender } = renderHook(({ key }) => useChecklistState(key), {
      initialProps: { key: KEY_A },
    });
    await act(async () => {});
    expect(result.current[0]).toEqual(new Set(["a-cell"]));

    rerender({ key: KEY_B });
    await act(async () => {});
    expect(result.current[0]).toEqual(new Set(["b-cell"]));
  });

  it("shows an empty set when switching to an unseen batch", async () => {
    localStorage.setItem(KEY_A, JSON.stringify(["a-cell"]));

    const { result, rerender } = renderHook(({ key }) => useChecklistState(key), {
      initialProps: { key: KEY_A },
    });
    await act(async () => {});
    expect(result.current[0]).toEqual(new Set(["a-cell"]));

    rerender({ key: KEY_B });
    await act(async () => {});
    expect(result.current[0]).toEqual(new Set());
  });

  // ---- Guard: empty initial set never overwrites stored progress --------------------------

  it("does not overwrite stored progress before the restore effect runs", () => {
    localStorage.setItem(KEY_A, JSON.stringify(["kept"]));
    renderHook(() => useChecklistState(KEY_A));
    // No toggle yet; the empty initial set must not clobber the stored value.
    expect(JSON.parse(localStorage.getItem(KEY_A)!)).toEqual(["kept"]);
  });

  // ---- Toggle -----------------------------------------------------------------------------

  it("adds a cell and persists it", async () => {
    const { result } = renderHook(() => useChecklistState(KEY_A));
    await act(async () => {});
    act(() => result.current[1]("r1:fat"));
    expect(result.current[0]).toEqual(new Set(["r1:fat"]));
    expect(JSON.parse(localStorage.getItem(KEY_A)!)).toEqual(["r1:fat"]);
  });

  it("removes an already-checked cell and persists the removal", async () => {
    localStorage.setItem(KEY_A, JSON.stringify(["r1:fat", "r2:sugar"]));
    const { result } = renderHook(() => useChecklistState(KEY_A));
    await act(async () => {});
    act(() => result.current[1]("r1:fat"));
    expect(result.current[0]).toEqual(new Set(["r2:sugar"]));
    expect(JSON.parse(localStorage.getItem(KEY_A)!)).toEqual(["r2:sugar"]);
  });

  it("toggles the same cell off and back on", async () => {
    const { result } = renderHook(() => useChecklistState(KEY_A));
    await act(async () => {});
    act(() => result.current[1]("cell"));
    expect(result.current[0]).toEqual(new Set(["cell"]));
    act(() => result.current[1]("cell"));
    expect(result.current[0]).toEqual(new Set());
    expect(JSON.parse(localStorage.getItem(KEY_A)!)).toEqual([]);
  });
});
