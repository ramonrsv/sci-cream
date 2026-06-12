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
import { QtyToggle, QtyToggleSelect, QTY_TOGGLE_SHORT_LABELS } from "./qty-toggle-select";

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

describe("QTY_TOGGLE_SHORT_LABELS", () => {
  it("maps Composition to its short label", () => {
    expect(QTY_TOGGLE_SHORT_LABELS[QtyToggle.Composition]).toBe("Comp.");
  });

  it("maps Quantity to its short label", () => {
    expect(QTY_TOGGLE_SHORT_LABELS[QtyToggle.Quantity]).toBe("Qty (g)");
  });

  it("maps Percentage to its short label", () => {
    expect(QTY_TOGGLE_SHORT_LABELS[QtyToggle.Percentage]).toBe("Qty (%)");
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
      Object.values(QtyToggle).map((qt) => QTY_TOGGLE_SHORT_LABELS[qt]),
    );
  });

  it("reflects the initial toggle value in the selected label", () => {
    const { container } = render(<TestWrapper initialQtyToggle={QtyToggle.Quantity} />);
    expect(getSelectedOptionLabel(container, "#qty-toggle-select")).toBe(
      QTY_TOGGLE_SHORT_LABELS[QtyToggle.Quantity],
    );
  });

  it("renders only the supplied supportedQtyToggles options", async () => {
    const supported = [QtyToggle.Composition, QtyToggle.Percentage];
    const { container } = render(<TestWrapper supportedQtyToggles={supported} />);
    expect(await getSelectOptionLabels(container, "#qty-toggle-select")).toEqual(
      supported.map((qt) => QTY_TOGGLE_SHORT_LABELS[qt]),
    );
  });

  it("updates the state when the user changes the selection", async () => {
    const { container } = render(<TestWrapper />);
    await selectOption(
      container,
      "#qty-toggle-select",
      QTY_TOGGLE_SHORT_LABELS[QtyToggle.Percentage],
    );
    expect(currentQtyToggle).toBe(QtyToggle.Percentage);
  });

  it("cycles through all toggle values and updates state correctly", async () => {
    const { container } = render(<TestWrapper />);

    for (const toggle of Object.values(QtyToggle)) {
      await selectOption(container, "#qty-toggle-select", QTY_TOGGLE_SHORT_LABELS[toggle]);
      expect(currentQtyToggle).toBe(toggle);
    }
  });
});
