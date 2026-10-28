import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";

import { useResetOnChange } from "./use-reset-on-change";
import { RetainedStateContext } from "./use-retained-state";

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

  describe("with a retainKey", () => {
    const RETAIN_KEY = "test-key";

    /** Wrapper supplying a fresh store as the retained state, as `RetainedStateProvider` does. */
    function withStore() {
      const store = new Map<string, unknown>();
      return function Wrapper({ children }: { children: ReactNode }) {
        return createElement(RetainedStateContext, { value: store }, children);
      };
    }

    /** Set the value to 5 under `resetKey` and `retainKey`, then unmount, like leaving the view. */
    function setAndLeave(
      wrapper: ReturnType<typeof withStore>,
      resetKey: string,
      retainKey: string,
    ) {
      const first = renderHook(() => useResetOnChange(resetKey, 0, retainKey), { wrapper });
      act(() => first.result.current[1](5));
      first.unmount();
    }

    it("restores the value on remount while the reset key is unchanged", () => {
      const wrapper = withStore();
      setAndLeave(wrapper, "a", RETAIN_KEY);

      const { result } = renderHook(() => useResetOnChange("a", 0, RETAIN_KEY), { wrapper });

      expect(result.current[0]).toBe(5);
    });

    it("resets on remount when the reset key has changed since", () => {
      const wrapper = withStore();
      setAndLeave(wrapper, "a", RETAIN_KEY);

      const { result } = renderHook(() => useResetOnChange("b", 99, RETAIN_KEY), { wrapper });

      expect(result.current[0]).toBe(99);
    });

    it("keeps a separate value per retainKey", () => {
      const wrapper = withStore();
      setAndLeave(wrapper, "a", "key-1");

      const { result } = renderHook(() => useResetOnChange("a", 0, "key-2"), { wrapper });

      expect(result.current[0]).toBe(0);
    });

    it("retains nothing without a retainKey, even under a provider", () => {
      const wrapper = withStore();
      const first = renderHook(() => useResetOnChange("a", 0), { wrapper });
      act(() => first.result.current[1](5));
      first.unmount();

      const { result } = renderHook(() => useResetOnChange("a", 0), { wrapper });

      expect(result.current[0]).toBe(0);
    });
  });
});
