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
  DeltaToggle,
  DeltaToggleSelect,
  DELTA_GLYPH,
  DELTA_TOGGLE_SHORT_LABELS,
  useDeltaToggleState,
} from "./delta-toggle-select";

// ---------------------------------------------------------------------------
// DELTA_TOGGLE_SHORT_LABELS
// ---------------------------------------------------------------------------

describe("DELTA_GLYPH", () => {
  // Must stay U+2206 INCREMENT (not U+0394 GREEK CAPITAL DELTA): the self-hosted Geist font ships
  // U+2206 but not U+0394, so only U+2206 renders deterministically across local and CI snapshots.
  it("is ∆ U+2206 INCREMENT, not Δ U+0394 GREEK CAPITAL DELTA", () => {
    expect(DELTA_GLYPH.codePointAt(0)).toBe(0x2206);
  });
});

describe("DELTA_TOGGLE_SHORT_LABELS", () => {
  it("prefixes every label with the DELTA_GLYPH (U+2206)", () => {
    for (const label of Object.values(DELTA_TOGGLE_SHORT_LABELS)) {
      expect(label.codePointAt(0)).toBe(0x2206);
    }
  });

  it("maps Off to its short label", () => {
    expect(DELTA_TOGGLE_SHORT_LABELS[DeltaToggle.Off]).toBe("∆ Off");
  });

  it("maps Absolute to its short label", () => {
    expect(DELTA_TOGGLE_SHORT_LABELS[DeltaToggle.Absolute]).toBe("∆ Abs");
  });

  it("maps Relative to its short label", () => {
    expect(DELTA_TOGGLE_SHORT_LABELS[DeltaToggle.Relative]).toBe("∆ Rel");
  });
});

// ---------------------------------------------------------------------------
// useDeltaToggleState hook
// ---------------------------------------------------------------------------

describe("useDeltaToggleState", () => {
  const KEY = "test-panel";

  beforeEach(() => localStorage.clear());

  it("defaults to Off (first toggle) when no persistKey and no options", () => {
    const { result } = renderHook(() => useDeltaToggleState(undefined));
    expect(result.current[0]).toBe(DeltaToggle.Off);
  });

  it("returns all DeltaToggle values as supportedDeltaToggles by default", () => {
    const { result } = renderHook(() => useDeltaToggleState(undefined));
    expect(result.current[2]).toEqual(Object.values(DeltaToggle));
  });

  it("respects a custom defaultValue", () => {
    const { result } = renderHook(() =>
      useDeltaToggleState(undefined, { defaultValue: DeltaToggle.Relative }),
    );
    expect(result.current[0]).toBe(DeltaToggle.Relative);
  });

  it("defaults to first of custom supportedDeltaToggles when no defaultValue given", () => {
    const { result } = renderHook(() =>
      useDeltaToggleState(undefined, {
        supportedDeltaToggles: [DeltaToggle.Absolute, DeltaToggle.Relative],
      }),
    );
    expect(result.current[0]).toBe(DeltaToggle.Absolute);
    expect(result.current[2]).toEqual([DeltaToggle.Absolute, DeltaToggle.Relative]);
  });

  it("persists the value under <persistKey>:delta", async () => {
    const { result } = renderHook(() => useDeltaToggleState(KEY));
    await act(async () => {});
    act(() => result.current[1](DeltaToggle.Absolute));
    await act(async () => {});
    expect(localStorage.getItem(`${KEY}:delta`)).toBe(JSON.stringify(DeltaToggle.Absolute));
  });

  it("restores a stored value on mount", async () => {
    localStorage.setItem(`${KEY}:delta`, JSON.stringify(DeltaToggle.Relative));
    const { result } = renderHook(() => useDeltaToggleState(KEY));
    await act(async () => {});
    expect(result.current[0]).toBe(DeltaToggle.Relative);
  });

  it("falls back to defaultValue when stored value is outside supportedDeltaToggles", async () => {
    localStorage.setItem(`${KEY}:delta`, JSON.stringify(DeltaToggle.Relative));
    const { result } = renderHook(() =>
      useDeltaToggleState(KEY, { supportedDeltaToggles: [DeltaToggle.Off, DeltaToggle.Absolute] }),
    );
    await act(async () => {});
    expect(result.current[0]).toBe(DeltaToggle.Off);
  });

  it("does not touch storage when persistKey is undefined", async () => {
    const { result } = renderHook(() => useDeltaToggleState(undefined));
    await act(async () => {});
    act(() => result.current[1](DeltaToggle.Absolute));
    await act(async () => {});
    expect(localStorage.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// DeltaToggleSelect component
// ---------------------------------------------------------------------------

describe("DeltaToggleSelect", () => {
  let currentDeltaToggle: DeltaToggle;

  /**
   * Wrapper component around a `DeltaToggleSelect` that owns a `DeltaToggle` state and exposes it
   * for assertions via `useEffect` and closure variables.
   */
  function TestWrapper({
    supportedDeltaToggles = Object.values(DeltaToggle),
    initialDeltaToggle = DeltaToggle.Off,
  }: {
    supportedDeltaToggles?: DeltaToggle[];
    initialDeltaToggle?: DeltaToggle;
  }) {
    const [deltaToggle, setDeltaToggle] = useState<DeltaToggle>(initialDeltaToggle);

    useEffect(() => {
      currentDeltaToggle = deltaToggle;
    }, [deltaToggle]);

    return (
      <DeltaToggleSelect
        supportedDeltaToggles={supportedDeltaToggles}
        deltaToggleState={[deltaToggle, setDeltaToggle]}
      />
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

  it("renders a select control inside #delta-toggle-select", () => {
    const { container } = render(<TestWrapper />);
    expect(container.querySelector("#delta-toggle-select")).toBeInTheDocument();
    expect(getSelectControl(container, "#delta-toggle-select")).toBeInTheDocument();
  });

  it("shows short labels as options for all supported toggles", async () => {
    const { container } = render(<TestWrapper />);
    expect(await getSelectOptionLabels(container, "#delta-toggle-select")).toEqual(
      Object.values(DeltaToggle).map((dt) => DELTA_TOGGLE_SHORT_LABELS[dt]),
    );
  });

  it("reflects the initial toggle value in the selected label", () => {
    const { container } = render(<TestWrapper initialDeltaToggle={DeltaToggle.Absolute} />);
    expect(getSelectedOptionLabel(container, "#delta-toggle-select")).toBe(
      DELTA_TOGGLE_SHORT_LABELS[DeltaToggle.Absolute],
    );
  });

  it("renders only the supplied supportedDeltaToggles options", async () => {
    const supported = [DeltaToggle.Off, DeltaToggle.Relative];
    const { container } = render(<TestWrapper supportedDeltaToggles={supported} />);
    expect(await getSelectOptionLabels(container, "#delta-toggle-select")).toEqual(
      supported.map((dt) => DELTA_TOGGLE_SHORT_LABELS[dt]),
    );
  });

  it("updates the state when the user changes the selection", async () => {
    const { container } = render(<TestWrapper />);
    await selectOption(
      container,
      "#delta-toggle-select",
      DELTA_TOGGLE_SHORT_LABELS[DeltaToggle.Relative],
    );
    expect(currentDeltaToggle).toBe(DeltaToggle.Relative);
  });

  it("cycles through all toggle values and updates state correctly", async () => {
    const { container } = render(<TestWrapper />);

    for (const toggle of Object.values(DeltaToggle)) {
      await selectOption(container, "#delta-toggle-select", DELTA_TOGGLE_SHORT_LABELS[toggle]);
      expect(currentDeltaToggle).toBe(toggle);
    }
  });
});
