"use client";

import { type RefObject, useEffect, useRef, useState } from "react";

/** Content-box size of an observed element, in integer pixels. */
export interface ElementSize {
  width: number;
  height: number;
}

/**
 * Observe an element's content-box size via `ResizeObserver`.
 *
 * Returns a `ref` to attach to the element and its latest {@link ElementSize}, or `null` until
 * measured. SSR/test-safe: when `ResizeObserver` is unavailable (server, jsdom) the size stays
 * `null` and no observer is created. Updates are suppressed when the rounded dimensions are
 * unchanged, so consumers don't re-render on sub-pixel jitter.
 */
export function useElementSize<T extends HTMLElement>(): {
  ref: RefObject<T | null>;
  size: ElementSize | null;
} {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<ElementSize | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      const next = { width: Math.round(rect.width), height: Math.round(rect.height) };
      setSize((prev) =>
        prev && prev.width === next.width && prev.height === next.height ? prev : next,
      );
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}
