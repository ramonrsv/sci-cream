import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

import {
  RetainedStateContext,
  useRetainedState,
  useRetainedStateSetter,
} from "./use-retained-state";

const KEY = "test-key";

/** Wrapper supplying `store` as the retained state, as `RetainedStateProvider` does. */
function withStore(store: Map<string, unknown>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <RetainedStateContext value={store}>{children}</RetainedStateContext>;
  };
}

describe("useRetainedState", () => {
  // ---- Initial value ----------------------------------------------------------------------

  it("starts at defaultValue when nothing is retained", () => {
    const { result } = renderHook(() => useRetainedState(KEY, 42), {
      wrapper: withStore(new Map()),
    });
    expect(result.current[0]).toBe(42);
  });

  it("starts at the retained value on the first render, never flashing the default", () => {
    const seen: number[] = [];
    renderHook(
      () => {
        const [value] = useRetainedState(KEY, 42);
        seen.push(value);
      },
      { wrapper: withStore(new Map([[KEY, 7]])) },
    );

    expect(seen[0]).toBe(7);
    expect(seen).not.toContain(42);
  });

  // ---- Updates ----------------------------------------------------------------------------

  it("updates like useState, including functional updaters", () => {
    const { result } = renderHook(() => useRetainedState(KEY, 1), {
      wrapper: withStore(new Map()),
    });

    act(() => result.current[1](5));
    expect(result.current[0]).toBe(5);

    act(() => result.current[1]((prev) => prev + 1));
    expect(result.current[0]).toBe(6);
  });

  it("writes the latest value through to the store", () => {
    const store = new Map<string, unknown>();
    const { result } = renderHook(() => useRetainedState(KEY, 1), { wrapper: withStore(store) });

    act(() => result.current[1](5));

    expect(store.get(KEY)).toBe(5);
  });

  // ---- Retention --------------------------------------------------------------------------

  it("retains the value across an unmount and remount that share a store", () => {
    const wrapper = withStore(new Map());
    const first = renderHook(() => useRetainedState(KEY, "default"), { wrapper });
    act(() => first.result.current[1]("kept"));
    first.unmount();

    const second = renderHook(() => useRetainedState(KEY, "default"), { wrapper });

    expect(second.result.current[0]).toBe("kept");
  });

  it("keeps separate keys independent", () => {
    const wrapper = withStore(new Map());
    const a = renderHook(() => useRetainedState("a", 0), { wrapper });
    const b = renderHook(() => useRetainedState("b", 0), { wrapper });
    act(() => a.result.current[1](1));
    a.unmount();
    b.unmount();

    const aAgain = renderHook(() => useRetainedState("a", 0), { wrapper });
    const bAgain = renderHook(() => useRetainedState("b", 0), { wrapper });

    expect(aAgain.result.current[0]).toBe(1);
    expect(bAgain.result.current[0]).toBe(0);
  });

  it("starts at defaultValue under a new store, as after a reload", () => {
    const first = renderHook(() => useRetainedState(KEY, 0), { wrapper: withStore(new Map()) });
    act(() => first.result.current[1](9));
    first.unmount();

    const second = renderHook(() => useRetainedState(KEY, 0), { wrapper: withStore(new Map()) });

    expect(second.result.current[0]).toBe(0);
  });

  // ---- Opting out -------------------------------------------------------------------------

  it("retains nothing when key is undefined", () => {
    const store = new Map<string, unknown>();
    const wrapper = withStore(store);
    const first = renderHook(() => useRetainedState<number>(undefined, 0), { wrapper });
    act(() => first.result.current[1](9));
    expect(first.result.current[0]).toBe(9);
    first.unmount();

    const second = renderHook(() => useRetainedState<number>(undefined, 0), { wrapper });

    expect(store.size).toBe(0);
    expect(second.result.current[0]).toBe(0);
  });

  it("behaves as a plain useState without a provider", () => {
    const first = renderHook(() => useRetainedState(KEY, 0));
    act(() => first.result.current[1](9));
    expect(first.result.current[0]).toBe(9);
    first.unmount();

    const second = renderHook(() => useRetainedState(KEY, 0));

    expect(second.result.current[0]).toBe(0);
  });
});

describe("useRetainedStateSetter", () => {
  it("hands a value to the next useRetainedState that mounts with that key", () => {
    const wrapper = withStore(new Map());
    const setter = renderHook(() => useRetainedStateSetter(), { wrapper });
    setter.unmount();
    setter.result.current(KEY, 7);

    const seen: number[] = [];
    renderHook(
      () => {
        const [value] = useRetainedState(KEY, 0);
        seen.push(value);
      },
      { wrapper },
    );

    expect(seen[0]).toBe(7);
    expect(seen).not.toContain(0);
  });

  it("overwrites a value the hook retained earlier", () => {
    const wrapper = withStore(new Map());
    const first = renderHook(() => useRetainedState(KEY, 0), { wrapper });
    act(() => first.result.current[1](3));
    first.unmount();

    const setter = renderHook(() => useRetainedStateSetter(), { wrapper });
    setter.result.current(KEY, 7);

    const second = renderHook(() => useRetainedState(KEY, 0), { wrapper });
    expect(second.result.current[0]).toBe(7);
  });

  it("does not move a hook that is already mounted", () => {
    const wrapper = withStore(new Map());
    const mounted = renderHook(() => useRetainedState(KEY, 0), { wrapper });
    const setter = renderHook(() => useRetainedStateSetter(), { wrapper });

    setter.result.current(KEY, 7);
    mounted.rerender();

    expect(mounted.result.current[0]).toBe(0);
  });

  it("returns the same function on every render", () => {
    const { result, rerender } = renderHook(() => useRetainedStateSetter(), {
      wrapper: withStore(new Map()),
    });
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });

  it("does nothing without a provider", () => {
    const setter = renderHook(() => useRetainedStateSetter());
    expect(() => setter.result.current(KEY, 7)).not.toThrow();

    const { result } = renderHook(() => useRetainedState(KEY, 0));

    expect(result.current[0]).toBe(0);
  });
});
