import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, renderHook, act } from "@testing-library/react";
import { useEffect, useState } from "react";

import {
  getSelectControl,
  getSelectedOptionLabel,
  getSelectOptionLabels,
  selectOption,
} from "@/__tests__/unit/select";
import {
  NormMode,
  NormModeSelect,
  NORM_MODE_SHORT_LABELS,
  useNormModeState,
} from "./normalize-toggle-select";

// ---------------------------------------------------------------------------
// NORM_MODE_SHORT_LABELS
// ---------------------------------------------------------------------------

describe("NORM_MODE_SHORT_LABELS", () => {
  it("maps FullSpread to its short label", () => {
    expect(NORM_MODE_SHORT_LABELS[NormMode.FullSpread]).toBe("Spread");
  });

  it("maps TargetCentered to its short label", () => {
    expect(NORM_MODE_SHORT_LABELS[NormMode.TargetCentered]).toBe("Target");
  });

  it("maps ValueCentered to its short label", () => {
    expect(NORM_MODE_SHORT_LABELS[NormMode.ValueCentered]).toBe("Value");
  });

  it("maps FillRange to its short label", () => {
    expect(NORM_MODE_SHORT_LABELS[NormMode.FillRange]).toBe("Range");
  });
});

// ---------------------------------------------------------------------------
// useNormModeState hook
// ---------------------------------------------------------------------------

describe("useNormModeState", () => {
  const KEY = "test-panel";

  beforeEach(() => localStorage.clear());

  it("defaults to FullSpread (first mode) when no persistKey and no options", () => {
    const { result } = renderHook(() => useNormModeState(undefined));
    expect(result.current[0]).toBe(NormMode.FullSpread);
  });

  it("returns all NormMode values as supportedModes by default", () => {
    const { result } = renderHook(() => useNormModeState(undefined));
    expect(result.current[2]).toEqual(Object.values(NormMode));
  });

  it("respects a custom defaultValue", () => {
    const { result } = renderHook(() =>
      useNormModeState(undefined, { defaultValue: NormMode.FillRange }),
    );
    expect(result.current[0]).toBe(NormMode.FillRange);
  });

  it("defaults to first of custom supportedModes when no defaultValue given", () => {
    const { result } = renderHook(() =>
      useNormModeState(undefined, {
        supportedModes: [NormMode.TargetCentered, NormMode.ValueCentered],
      }),
    );
    expect(result.current[0]).toBe(NormMode.TargetCentered);
    expect(result.current[2]).toEqual([NormMode.TargetCentered, NormMode.ValueCentered]);
  });

  it("persists the value under <persistKey>:norm", async () => {
    const { result } = renderHook(() => useNormModeState(KEY));
    await act(async () => {});
    act(() => result.current[1](NormMode.FillRange));
    await act(async () => {});
    expect(localStorage.getItem(`${KEY}:norm`)).toBe(JSON.stringify(NormMode.FillRange));
  });

  it("restores a stored value on mount", async () => {
    localStorage.setItem(`${KEY}:norm`, JSON.stringify(NormMode.ValueCentered));
    const { result } = renderHook(() => useNormModeState(KEY));
    await act(async () => {});
    expect(result.current[0]).toBe(NormMode.ValueCentered);
  });

  it("falls back to defaultValue when stored value is outside supportedModes", async () => {
    localStorage.setItem(`${KEY}:norm`, JSON.stringify(NormMode.FillRange));
    const { result } = renderHook(() =>
      useNormModeState(KEY, { supportedModes: [NormMode.FullSpread, NormMode.TargetCentered] }),
    );
    await act(async () => {});
    expect(result.current[0]).toBe(NormMode.FullSpread);
  });

  it("does not touch storage when persistKey is undefined", async () => {
    const { result } = renderHook(() => useNormModeState(undefined));
    await act(async () => {});
    act(() => result.current[1](NormMode.FillRange));
    await act(async () => {});
    expect(localStorage.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// NormModeSelect component
// ---------------------------------------------------------------------------

describe("NormModeSelect", () => {
  let currentNormMode: NormMode;

  /**
   * Wrapper component around a `NormModeSelect` that owns a `NormMode` state and exposes it for
   * assertions via `useEffect` and closure variables.
   */
  function TestWrapper({
    supportedModes = Object.values(NormMode),
    initialMode = NormMode.FullSpread,
  }: {
    supportedModes?: NormMode[];
    initialMode?: NormMode;
  }) {
    const [normMode, setNormMode] = useState<NormMode>(initialMode);

    useEffect(() => {
      currentNormMode = normMode;
    }, [normMode]);

    return (
      <NormModeSelect supportedModes={supportedModes} normModeState={[normMode, setNormMode]} />
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setupVitestCanvasMock();
  });

  afterEach(async () => {
    cleanup();
    await vi.waitFor(() => {}, { timeout: 100 });
  });

  it("renders a select control inside #normalize-toggle-select", () => {
    const { container } = render(<TestWrapper />);
    expect(container.querySelector("#normalize-toggle-select")).toBeInTheDocument();
    expect(getSelectControl(container, "#normalize-toggle-select")).toBeInTheDocument();
  });

  it("shows short labels as options for all supported modes", async () => {
    const { container } = render(<TestWrapper />);
    expect(await getSelectOptionLabels(container, "#normalize-toggle-select")).toEqual(
      Object.values(NormMode).map((mode) => NORM_MODE_SHORT_LABELS[mode]),
    );
  });

  it("reflects the initial mode value in the selected label", () => {
    const { container } = render(<TestWrapper initialMode={NormMode.TargetCentered} />);
    expect(getSelectedOptionLabel(container, "#normalize-toggle-select")).toBe(
      NORM_MODE_SHORT_LABELS[NormMode.TargetCentered],
    );
  });

  it("renders only the supplied supportedModes options", async () => {
    const supported = [NormMode.FullSpread, NormMode.FillRange];
    const { container } = render(<TestWrapper supportedModes={supported} />);
    expect(await getSelectOptionLabels(container, "#normalize-toggle-select")).toEqual(
      supported.map((mode) => NORM_MODE_SHORT_LABELS[mode]),
    );
  });

  it("updates the state when the user changes the selection", async () => {
    const { container } = render(<TestWrapper />);
    await selectOption(
      container,
      "#normalize-toggle-select",
      NORM_MODE_SHORT_LABELS[NormMode.ValueCentered],
    );
    expect(currentNormMode).toBe(NormMode.ValueCentered);
  });

  it("cycles through all mode values and updates state correctly", async () => {
    const { container } = render(<TestWrapper />);

    for (const mode of Object.values(NormMode)) {
      await selectOption(container, "#normalize-toggle-select", NORM_MODE_SHORT_LABELS[mode]);
      expect(currentNormMode).toBe(mode);
    }
  });
});
