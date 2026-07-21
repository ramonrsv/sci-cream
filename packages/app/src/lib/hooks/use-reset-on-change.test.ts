import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useResetOnChange } from "./use-reset-on-change";

describe("useResetOnChange", () => {
  it("starts at the reset value", () => {
    const { result } = renderHook(() => useResetOnChange("a", 10));
    expect(result.current[0]).toBe(10);
  });

  it("keeps state updates while the key is unchanged", () => {
    const { result, rerender } = renderHook(({ key }) => useResetOnChange(key, 0), {
      initialProps: { key: "a" },
    });

    act(() => result.current[1](5));
    expect(result.current[0]).toBe(5);

    rerender({ key: "a" });
    expect(result.current[0]).toBe(5);
  });

  it("resets to the new reset value when the key changes", () => {
    const { result, rerender } = renderHook(({ key, reset }) => useResetOnChange(key, reset), {
      initialProps: { key: "a", reset: 0 },
    });

    act(() => result.current[1](5));
    expect(result.current[0]).toBe(5);

    rerender({ key: "b", reset: 99 });
    expect(result.current[0]).toBe(99);
  });

  it("returns the reset value in the same render the key changes", () => {
    const seen: number[] = [];
    const { rerender } = renderHook(
      ({ key }) => {
        seen.push(useResetOnChange(key, key === "a" ? 1 : 2)[0]);
      },
      { initialProps: { key: "a" } },
    );

    rerender({ key: "b" });

    // The render-phase reset re-renders once, so "b" renders twice; crucially the stale value (1)
    // is never observed after the switch — every post-switch render already shows the reset (2).
    expect(seen[0]).toBe(1);
    expect(seen.slice(1).every((v) => v === 2)).toBe(true);
  });

  it("compares the key by reference", () => {
    const { result, rerender } = renderHook(({ key }) => useResetOnChange(key, 0), {
      initialProps: { key: { id: 1 } },
    });

    act(() => result.current[1](5));

    // A new object with equal contents is a different reference, so it triggers a reset.
    rerender({ key: { id: 1 } });
    expect(result.current[0]).toBe(0);
  });
});
