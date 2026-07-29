import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act } from "@testing-library/react";

import { useElementSize, type ElementSize } from "./use-element-size";

/**
 * A `ResizeObserver` that records its instances and lets a test emit a `contentRect`. The shared
 * mock in `vitest.setup.ts` only no-ops, so it can't drive the round/dedupe path; this one can.
 */
class ControllableResizeObserver {
  static instances: ControllableResizeObserver[] = [];
  callback: ResizeObserverCallback;
  disconnected = false;

  /** Captures the callback and records the instance for the test to reach. */
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    ControllableResizeObserver.instances.push(this);
  }

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = () => {
    this.disconnected = true;
  };

  /** Delivers a `contentRect` to the observed callback, as the browser would on a resize. */
  emit(rect: { width: number; height: number }) {
    this.callback([{ contentRect: rect as DOMRectReadOnly }] as ResizeObserverEntry[], this);
  }
}

/**
 * Renders the hook onto a real element, reports the current size as text, and records each
 * rendered `size` into `sizes` so a test can assert on referential identity across renders.
 */
function Probe({ sizes }: { sizes?: (ElementSize | null)[] }) {
  const { ref, size } = useElementSize<HTMLDivElement>();
  sizes?.push(size);
  return <div ref={ref}>{size ? `${size.width}x${size.height}` : "null"}</div>;
}

/** The single observer created for the mounted `Probe`. */
function currentObserver(): ControllableResizeObserver {
  const observer = ControllableResizeObserver.instances.at(-1);
  if (!observer) throw new Error("no ResizeObserver was created");
  return observer;
}

describe("useElementSize", () => {
  beforeEach(() => {
    ControllableResizeObserver.instances = [];
    vi.stubGlobal("ResizeObserver", ControllableResizeObserver);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("observes the attached element on mount", () => {
    const { container } = render(<Probe />);
    const observer = currentObserver();
    expect(observer.observe).toHaveBeenCalledWith(container.firstChild);
  });

  it("is null until the observer emits", () => {
    const { container } = render(<Probe />);
    expect(container.textContent).toBe("null");
  });

  it("reports the rounded content-box size", () => {
    const { container } = render(<Probe />);
    act(() => currentObserver().emit({ width: 100.4, height: 50.6 }));
    expect(container.textContent).toBe("100x51");
  });

  it("keeps the same size object when the rounded dimensions are unchanged", () => {
    const sizes: (ElementSize | null)[] = [];
    render(<Probe sizes={sizes} />);
    const observer = currentObserver();

    act(() => observer.emit({ width: 100.4, height: 50.1 }));
    const first = sizes.at(-1);

    // Different sub-pixel values that round to the same integers must not produce a new object,
    // so consumers keying off `size` identity don't re-run.
    act(() => observer.emit({ width: 100.2, height: 49.6 }));
    expect(sizes.at(-1)).toBe(first);
  });

  it("re-renders when the rounded size changes", () => {
    const { container } = render(<Probe />);
    const observer = currentObserver();

    act(() => observer.emit({ width: 100, height: 50 }));
    expect(container.textContent).toBe("100x50");

    act(() => observer.emit({ width: 120, height: 60 }));
    expect(container.textContent).toBe("120x60");
  });

  it("disconnects the observer on unmount", () => {
    const { unmount } = render(<Probe />);
    const observer = currentObserver();
    expect(observer.disconnected).toBe(false);
    unmount();
    expect(observer.disconnected).toBe(true);
  });

  it("stays null and creates no observer when ResizeObserver is unavailable", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    const { container } = render(<Probe />);
    expect(container.textContent).toBe("null");
    expect(ControllableResizeObserver.instances).toHaveLength(0);
  });
});
