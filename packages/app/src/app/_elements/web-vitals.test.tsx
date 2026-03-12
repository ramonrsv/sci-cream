import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

import type { Metric } from "@/app/_elements/web-vitals";

// Mock next/web-vitals before importing the component
const mockUseReportWebVitals = vi.fn();
vi.mock("next/web-vitals", () => ({ useReportWebVitals: mockUseReportWebVitals }));

// Import after mocks are set up (vi.mock is hoisted)
const { WebVitals } = await import("@/app/_elements/web-vitals");

// ---------------------------------------------------------------------------
// WebVitals component
// ---------------------------------------------------------------------------

describe("WebVitals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as unknown as Record<string, unknown>).__webVitals;
  });

  afterEach(cleanup);

  it("calls useReportWebVitals with a callback", () => {
    render(<WebVitals />);
    expect(mockUseReportWebVitals).toHaveBeenCalledOnce();
    expect(mockUseReportWebVitals).toHaveBeenCalledWith(expect.any(Function));
  });

  it("initializes window.__webVitals on mount", () => {
    render(<WebVitals />);
    expect(window.__webVitals).toBeDefined();
    expect(window.__webVitals).toEqual({});
  });

  it("does not overwrite existing window.__webVitals", () => {
    const existing = { LCP: {} as Metric };
    window.__webVitals = existing;

    render(<WebVitals />);
    expect(window.__webVitals).toBe(existing);
  });

  it("the callback stores metrics on window.__webVitals", () => {
    window.__webVitals = {};

    render(<WebVitals />);
    const callback = mockUseReportWebVitals.mock.calls[0][0];

    const metric = { name: "LCP", value: 123.456, rating: "good" } as unknown as Metric;
    callback(metric);

    expect(window.__webVitals["LCP"]).toBe(metric);
  });

  it("the callback logs the metric with rounded value", () => {
    window.__webVitals = {};
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    render(<WebVitals />);
    const callback = mockUseReportWebVitals.mock.calls[0][0];

    const metric = { name: "CLS", value: 0.12345, rating: "good" } as unknown as Metric;
    callback(metric);

    expect(consoleSpy).toHaveBeenCalledWith("CLS: 0.12 (rating: good)");
    consoleSpy.mockRestore();
  });

  it("renders nothing (returns null)", () => {
    const { container } = render(<WebVitals />);
    expect(container.innerHTML).toBe("");
  });
});
