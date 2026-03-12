import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { useEffect, useState } from "react";

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

  it("renders a select inside #qty-toggle-select", () => {
    const { container } = render(<TestWrapper />);
    const wrapper = container.querySelector("#qty-toggle-select");
    expect(wrapper).toBeInTheDocument();
    expect(wrapper!.querySelector("select")).toBeInTheDocument();
  });

  it("shows short labels as option text for all supported toggles", () => {
    const { container } = render(<TestWrapper />);
    const select = container.querySelector("#qty-toggle-select select") as HTMLSelectElement;
    const optionTexts = Array.from(select.options).map((o) => o.text);
    expect(optionTexts).toEqual(Object.values(QtyToggle).map(qtyToggleToShortStr));
  });

  it("reflects the initial toggle value in the select", () => {
    const { container } = render(<TestWrapper initialQtyToggle={QtyToggle.Quantity} />);
    const select = container.querySelector("#qty-toggle-select select") as HTMLSelectElement;
    expect(select.value).toBe(QtyToggle.Quantity);
  });

  it("renders only the supplied supportedQtyToggles options", () => {
    const supported = [QtyToggle.Composition, QtyToggle.Percentage];
    const { container } = render(<TestWrapper supportedQtyToggles={supported} />);
    const select = container.querySelector("#qty-toggle-select select") as HTMLSelectElement;
    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).toEqual(supported);
  });

  it("updates the state when the user changes the selection", () => {
    const { container } = render(<TestWrapper />);
    const select = container.querySelector("#qty-toggle-select select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: QtyToggle.Percentage } });
    expect(select.value).toBe(QtyToggle.Percentage);
    expect(currentQtyToggle).toBe(QtyToggle.Percentage);
  });

  it("cycles through all toggle values and updates state correctly", () => {
    const { container } = render(<TestWrapper />);
    const select = container.querySelector("#qty-toggle-select select") as HTMLSelectElement;

    for (const toggle of Object.values(QtyToggle)) {
      fireEvent.change(select, { target: { value: toggle } });
      expect(select.value).toBe(toggle);
      expect(currentQtyToggle).toBe(toggle);
    }
  });
});
