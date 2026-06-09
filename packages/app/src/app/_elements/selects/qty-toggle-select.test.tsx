import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { useEffect, useState } from "react";

import {
  getSelectControl,
  getSelectedOptionLabel,
  getSelectOptionLabels,
  selectOption,
} from "@/__tests__/unit/select";
import { QtyToggle, QtyToggleSelect, qtyToggleToShortStr } from "./qty-toggle-select";

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

describe("qtyToggleToShortStr", () => {
  it("returns short label for Composition", () => {
    expect(qtyToggleToShortStr(QtyToggle.Composition)).toBe("Comp.");
  });

  it("returns short label for Quantity", () => {
    expect(qtyToggleToShortStr(QtyToggle.Quantity)).toBe("Qty (g)");
  });

  it("returns short label for Percentage", () => {
    expect(qtyToggleToShortStr(QtyToggle.Percentage)).toBe("Qty (%)");
  });

  it("throws for an unsupported value", () => {
    expect(() => qtyToggleToShortStr("Unknown" as QtyToggle)).toThrow(
      "Unsupported QtyToggle value",
    );
  });
});

// ---------------------------------------------------------------------------
// QtyToggleSelect component
// ---------------------------------------------------------------------------

describe("QtyToggleSelect", () => {
  let currentQtyToggle: QtyToggle;

  /**
   * Wrapper component around a `QtyToggleSelect` that owns a `QtyToggle` state, which is a prop to
   * `QtyToggleSelect`, and exposes it for assertions via `useEffect` and closure variables.
   */
  function TestWrapper({
    supportedQtyToggles = Object.values(QtyToggle),
    initialQtyToggle = QtyToggle.Composition,
  }: {
    supportedQtyToggles?: QtyToggle[];
    initialQtyToggle?: QtyToggle;
  }) {
    const [qtyToggle, setQtyToggle] = useState<QtyToggle>(initialQtyToggle);

    useEffect(() => {
      currentQtyToggle = qtyToggle;
    }, [qtyToggle]);

    return (
      <QtyToggleSelect
        supportedQtyToggles={supportedQtyToggles}
        qtyToggleState={[qtyToggle, setQtyToggle]}
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

  it("renders a select control inside #qty-toggle-select", () => {
    const { container } = render(<TestWrapper />);
    expect(container.querySelector("#qty-toggle-select")).toBeInTheDocument();
    expect(getSelectControl(container, "#qty-toggle-select")).toBeInTheDocument();
  });

  it("shows short labels as options for all supported toggles", async () => {
    const { container } = render(<TestWrapper />);
    expect(await getSelectOptionLabels(container, "#qty-toggle-select")).toEqual(
      Object.values(QtyToggle).map(qtyToggleToShortStr),
    );
  });

  it("reflects the initial toggle value in the selected label", () => {
    const { container } = render(<TestWrapper initialQtyToggle={QtyToggle.Quantity} />);
    expect(getSelectedOptionLabel(container, "#qty-toggle-select")).toBe(
      qtyToggleToShortStr(QtyToggle.Quantity),
    );
  });

  it("renders only the supplied supportedQtyToggles options", async () => {
    const supported = [QtyToggle.Composition, QtyToggle.Percentage];
    const { container } = render(<TestWrapper supportedQtyToggles={supported} />);
    expect(await getSelectOptionLabels(container, "#qty-toggle-select")).toEqual(
      supported.map(qtyToggleToShortStr),
    );
  });

  it("updates the state when the user changes the selection", async () => {
    const { container } = render(<TestWrapper />);
    await selectOption(container, "#qty-toggle-select", qtyToggleToShortStr(QtyToggle.Percentage));
    expect(currentQtyToggle).toBe(QtyToggle.Percentage);
  });

  it("cycles through all toggle values and updates state correctly", async () => {
    const { container } = render(<TestWrapper />);

    for (const toggle of Object.values(QtyToggle)) {
      await selectOption(container, "#qty-toggle-select", qtyToggleToShortStr(toggle));
      expect(currentQtyToggle).toBe(toggle);
    }
  });
});
