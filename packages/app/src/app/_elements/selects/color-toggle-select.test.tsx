import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, renderHook, act } from "@testing-library/react";
import { useEffect, useState } from "react";

import { Color } from "@/lib/styles/colors";
import {
  getSelectControl,
  getSelectedOptionLabel,
  getSelectOptionLabels,
  selectOption,
} from "@/__tests__/unit/select";
import {
  ColorMode,
  ColorModeSelect,
  COLOR_MODE_SHORT_LABELS,
  resolveStatusColor,
  useColorModeState,
} from "./color-toggle-select";

// ---------------------------------------------------------------------------
// resolveStatusColor
// ---------------------------------------------------------------------------

describe("resolveStatusColor", () => {
  // span 80; ideal band (15% inset) is [22, 78]; in-range-but-non-ideal is [10,22) or (78,90].
  const range = { min: 10, max: 90 };

  it("returns gray when the value is not a usable number", () => {
    expect(resolveStatusColor(ColorMode.Range, { range, value: undefined })).toBe(Color.GraphGray);
    expect(resolveStatusColor(ColorMode.Range, { range, value: NaN })).toBe(Color.GraphGray);
  });

  describe("Range mode", () => {
    it("scores position within the acceptable range", () => {
      expect(resolveStatusColor(ColorMode.Range, { range, value: 50 })).toBe(Color.GraphGreen);
      expect(resolveStatusColor(ColorMode.Range, { range, value: 12 })).toBe(Color.GraphYellow);
      expect(resolveStatusColor(ColorMode.Range, { range, value: 200 })).toBe(Color.GraphRedDull);
    });

    it("returns gray when there is no range", () => {
      expect(resolveStatusColor(ColorMode.Range, { value: 50 })).toBe(Color.GraphGray);
    });

    it("returns gray for a degenerate range (max <= min)", () => {
      expect(resolveStatusColor(ColorMode.Range, { range: { min: 5, max: 5 }, value: 5 })).toBe(
        Color.GraphGray,
      );
    });

    it("ignores the target", () => {
      expect(resolveStatusColor(ColorMode.Range, { range, value: 50, target: 1000 })).toBe(
        Color.GraphGreen,
      );
    });
  });

  describe("Target mode", () => {
    it("scores proximity to the target", () => {
      expect(resolveStatusColor(ColorMode.Target, { value: 100, target: 100 })).toBe(
        Color.GraphGreen,
      );
      expect(resolveStatusColor(ColorMode.Target, { value: 108, target: 100 })).toBe(
        Color.GraphYellow,
      );
      expect(resolveStatusColor(ColorMode.Target, { value: 200, target: 100 })).toBe(
        Color.GraphRedDull,
      );
    });

    it("returns gray with no target, and never falls back to the range", () => {
      expect(resolveStatusColor(ColorMode.Target, { range, value: 50 })).toBe(Color.GraphGray);
    });

    it("returns gray for a zero target (relative proximity is undefined)", () => {
      expect(resolveStatusColor(ColorMode.Target, { value: 0, target: 0 })).toBe(Color.GraphGray);
    });
  });

  describe("Auto mode", () => {
    it("uses target proximity when a target is set", () => {
      // Value is ideal-in-range (green by range) but far from target (red by target): target wins.
      expect(resolveStatusColor(ColorMode.Auto, { range, value: 50, target: 100 })).toBe(
        Color.GraphRedDull,
      );
    });

    it("falls back to range position when there is no target", () => {
      expect(resolveStatusColor(ColorMode.Auto, { range, value: 50 })).toBe(Color.GraphGreen);
    });

    it("returns gray when neither a range nor a target applies", () => {
      expect(resolveStatusColor(ColorMode.Auto, { value: 50 })).toBe(Color.GraphGray);
    });
  });

  describe("Worst mode", () => {
    it("returns the worse of the range and target colors", () => {
      // Green by range (ideal), yellow by target (~8% off): worst is yellow.
      expect(resolveStatusColor(ColorMode.Worst, { range, value: 50, target: 46 })).toBe(
        Color.GraphYellow,
      );
    });

    it("uses whichever single score is available", () => {
      expect(resolveStatusColor(ColorMode.Worst, { range, value: 12 })).toBe(Color.GraphYellow);
      expect(resolveStatusColor(ColorMode.Worst, { value: 108, target: 100 })).toBe(
        Color.GraphYellow,
      );
    });

    it("returns gray when neither applies", () => {
      expect(resolveStatusColor(ColorMode.Worst, { value: 50 })).toBe(Color.GraphGray);
    });
  });
});

// ---------------------------------------------------------------------------
// COLOR_MODE_SHORT_LABELS
// ---------------------------------------------------------------------------

describe("COLOR_MODE_SHORT_LABELS", () => {
  it("maps every mode to its short label", () => {
    expect(COLOR_MODE_SHORT_LABELS[ColorMode.Auto]).toBe("Auto");
    expect(COLOR_MODE_SHORT_LABELS[ColorMode.Range]).toBe("Range");
    expect(COLOR_MODE_SHORT_LABELS[ColorMode.Target]).toBe("Target");
    expect(COLOR_MODE_SHORT_LABELS[ColorMode.Worst]).toBe("Worst");
  });
});

// ---------------------------------------------------------------------------
// useColorModeState hook
// ---------------------------------------------------------------------------

describe("useColorModeState", () => {
  const KEY = "test-panel";

  beforeEach(() => localStorage.clear());

  it("defaults to Auto (first mode) when no persistKey and no options", () => {
    const { result } = renderHook(() => useColorModeState(undefined));
    expect(result.current[0]).toBe(ColorMode.Auto);
  });

  it("returns all ColorMode values as supportedModes by default", () => {
    const { result } = renderHook(() => useColorModeState(undefined));
    expect(result.current[2]).toEqual(Object.values(ColorMode));
  });

  it("respects a custom defaultValue", () => {
    const { result } = renderHook(() =>
      useColorModeState(undefined, { defaultValue: ColorMode.Worst }),
    );
    expect(result.current[0]).toBe(ColorMode.Worst);
  });

  it("defaults to first of custom supportedModes when no defaultValue given", () => {
    const { result } = renderHook(() =>
      useColorModeState(undefined, { supportedModes: [ColorMode.Range, ColorMode.Target] }),
    );
    expect(result.current[0]).toBe(ColorMode.Range);
    expect(result.current[2]).toEqual([ColorMode.Range, ColorMode.Target]);
  });

  it("persists the value under <persistKey>:color", async () => {
    const { result } = renderHook(() => useColorModeState(KEY));
    await act(async () => {});
    act(() => result.current[1](ColorMode.Range));
    await act(async () => {});
    expect(localStorage.getItem(`${KEY}:color`)).toBe(JSON.stringify(ColorMode.Range));
  });

  it("restores a stored value on mount", async () => {
    localStorage.setItem(`${KEY}:color`, JSON.stringify(ColorMode.Target));
    const { result } = renderHook(() => useColorModeState(KEY));
    await act(async () => {});
    expect(result.current[0]).toBe(ColorMode.Target);
  });

  it("falls back to defaultValue when stored value is outside supportedModes", async () => {
    localStorage.setItem(`${KEY}:color`, JSON.stringify(ColorMode.Worst));
    const { result } = renderHook(() =>
      useColorModeState(KEY, { supportedModes: [ColorMode.Auto, ColorMode.Range] }),
    );
    await act(async () => {});
    expect(result.current[0]).toBe(ColorMode.Auto);
  });

  it("does not touch storage when persistKey is undefined", async () => {
    const { result } = renderHook(() => useColorModeState(undefined));
    await act(async () => {});
    act(() => result.current[1](ColorMode.Range));
    await act(async () => {});
    expect(localStorage.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ColorModeSelect component
// ---------------------------------------------------------------------------

describe("ColorModeSelect", () => {
  let currentColorMode: ColorMode;

  /**
   * Wrapper component around a `ColorModeSelect` that owns a `ColorMode` state and exposes it for
   * assertions via `useEffect` and closure variables.
   */
  function TestWrapper({
    supportedModes = Object.values(ColorMode),
    initialMode = ColorMode.Auto,
  }: {
    supportedModes?: ColorMode[];
    initialMode?: ColorMode;
  }) {
    const [colorMode, setColorMode] = useState<ColorMode>(initialMode);

    useEffect(() => {
      currentColorMode = colorMode;
    }, [colorMode]);

    return (
      <ColorModeSelect supportedModes={supportedModes} colorModeState={[colorMode, setColorMode]} />
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

  it("renders a select control inside #color-toggle-select", () => {
    const { container } = render(<TestWrapper />);
    expect(container.querySelector("#color-toggle-select")).toBeInTheDocument();
    expect(getSelectControl(container, "#color-toggle-select")).toBeInTheDocument();
  });

  it("shows short labels as options for all supported modes", async () => {
    const { container } = render(<TestWrapper />);
    expect(await getSelectOptionLabels(container, "#color-toggle-select")).toEqual(
      Object.values(ColorMode).map((mode) => COLOR_MODE_SHORT_LABELS[mode]),
    );
  });

  it("reflects the initial mode value in the selected label", () => {
    const { container } = render(<TestWrapper initialMode={ColorMode.Target} />);
    expect(getSelectedOptionLabel(container, "#color-toggle-select")).toBe(
      COLOR_MODE_SHORT_LABELS[ColorMode.Target],
    );
  });

  it("renders only the supplied supportedModes options", async () => {
    const supported = [ColorMode.Auto, ColorMode.Worst];
    const { container } = render(<TestWrapper supportedModes={supported} />);
    expect(await getSelectOptionLabels(container, "#color-toggle-select")).toEqual(
      supported.map((mode) => COLOR_MODE_SHORT_LABELS[mode]),
    );
  });

  it("updates the state when the user changes the selection", async () => {
    const { container } = render(<TestWrapper />);
    await selectOption(container, "#color-toggle-select", COLOR_MODE_SHORT_LABELS[ColorMode.Range]);
    expect(currentColorMode).toBe(ColorMode.Range);
  });

  it("cycles through all mode values and updates state correctly", async () => {
    const { container } = render(<TestWrapper />);

    for (const mode of Object.values(ColorMode)) {
      await selectOption(container, "#color-toggle-select", COLOR_MODE_SHORT_LABELS[mode]);
      expect(currentColorMode).toBe(mode);
    }
  });
});
