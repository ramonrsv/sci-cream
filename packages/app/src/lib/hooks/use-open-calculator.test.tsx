import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

import { useRecipeIdxState } from "@/app/_elements/selects/recipe-select";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import { useOpenCalculator } from "./use-open-calculator";
import { RetainedStateContext } from "./use-retained-state";

const { mockPush, mockRouter } = vi.hoisted(() => {
  const mockPush = vi.fn();
  return { mockPush, mockRouter: { push: mockPush } };
});
vi.mock("next/navigation", () => ({ useRouter: () => mockRouter }));

/** Wrapper supplying `store` as the retained state, as `RetainedStateProvider` does. */
function withStore(store: Map<string, unknown>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <RetainedStateContext value={store}>{children}</RetainedStateContext>;
  };
}

/** The slot a calculator editor mounting now would start on, read the way `RecipeEditor` does. */
function editorSlot(store: Map<string, unknown>): number {
  const { result } = renderHook(() => useRecipeIdxState(STORAGE_KEYS.recipeEditorPanel), {
    wrapper: withStore(store),
  });
  return result.current[0];
}

describe("useOpenCalculator", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("navigates to the calculator, leaving the slot out of the URL", () => {
    const { result } = renderHook(() => useOpenCalculator(), { wrapper: withStore(new Map()) });

    result.current(2);

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/calculator");
  });

  it.each([0, 1, 2])("starts the calculator's editor on slot %i", (slot) => {
    const store = new Map<string, unknown>();
    const { result } = renderHook(() => useOpenCalculator(), { wrapper: withStore(store) });

    result.current(slot);

    expect(editorSlot(store)).toBe(slot);
  });

  it("sets the slot before it navigates", () => {
    const store = new Map<string, unknown>();
    let slotWhenNavigating: number | undefined;
    mockPush.mockImplementation(() => {
      slotWhenNavigating = editorSlot(store);
    });
    const { result } = renderHook(() => useOpenCalculator(), { wrapper: withStore(store) });

    result.current(2);

    expect(slotWhenNavigating).toBe(2);
  });

  it("overrides the slot the editor retained earlier", () => {
    const store = new Map<string, unknown>();
    const earlier = renderHook(() => useRecipeIdxState(STORAGE_KEYS.recipeEditorPanel), {
      wrapper: withStore(store),
    });
    act(() => earlier.result.current[1](1));
    earlier.unmount();
    const { result } = renderHook(() => useOpenCalculator(), { wrapper: withStore(store) });

    result.current(2);

    expect(editorSlot(store)).toBe(2);
  });

  it("leaves the slots of the calculator's other views alone", () => {
    const store = new Map<string, unknown>();
    const composition = () =>
      renderHook(() => useRecipeIdxState(STORAGE_KEYS.compositionBreakdownPanelView), {
        wrapper: withStore(store),
      });
    const earlier = composition();
    act(() => earlier.result.current[1](1));
    earlier.unmount();
    const { result } = renderHook(() => useOpenCalculator(), { wrapper: withStore(store) });

    result.current(2);

    expect(composition().result.current[0]).toBe(1);
  });

  it("still navigates when no provider is mounted", () => {
    const { result } = renderHook(() => useOpenCalculator());

    result.current(2);

    expect(mockPush).toHaveBeenCalledWith("/calculator");
  });

  it("returns the same function on every render", () => {
    const { result, rerender } = renderHook(() => useOpenCalculator(), {
      wrapper: withStore(new Map()),
    });
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });
});
