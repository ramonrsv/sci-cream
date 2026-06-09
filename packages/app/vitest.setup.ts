import { vi } from "vitest";

/**
 * Mock implementation of `ResizeObserver`, which jsdom does not provide but Headless UI v2 needs to
 * anchor the `Select`/`Listbox` popups. Shared across all component tests via `setupFiles`.
 */
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);
