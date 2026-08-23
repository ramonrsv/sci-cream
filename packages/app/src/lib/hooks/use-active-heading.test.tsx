import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, cleanup } from "@testing-library/react";

import { APP_CONTENT_ID } from "@/lib/app-shell";
import { useActiveHeading } from "./use-active-heading";

/**
 * An `IntersectionObserver` that records its instances and lets a test drive the callback.
 *
 * jsdom provides none, and the hook skips observing when it is absent — so without this the
 * band logic has no way to run.
 */
class ControllableIntersectionObserver {
  static instances: ControllableIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  options: IntersectionObserverInit | undefined;
  observed: Element[] = [];
  disconnected = false;

  /** Captures the callback and options, and records the instance for the test to reach. */
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
    ControllableIntersectionObserver.instances.push(this);
  }

  observe = (element: Element) => {
    this.observed.push(element);
  };
  unobserve = vi.fn();
  disconnect = () => {
    this.disconnected = true;
  };

  /** Deliver crossings, as the browser would when the observed band gains or loses a heading. */
  emit(crossings: { id: string; isIntersecting: boolean }[]) {
    const entries = crossings.map(({ id, isIntersecting }) => ({
      target: document.getElementById(id)!,
      isIntersecting,
    })) as unknown as IntersectionObserverEntry[];
    act(() => this.callback(entries, this as unknown as IntersectionObserver));
  }
}

/** The latest value the hook returned, reported as text so the test can read it back. */
function Probe({ ids, scope = "/page" }: { ids: string[]; scope?: string }) {
  return <span data-testid="active">{useActiveHeading(ids, scope) ?? "none"}</span>;
}

/** Build the scroller and `ids` worth of headings inside it, as a rendered docs page would. */
function mountPage(ids: string[]) {
  const root = document.createElement("div");
  root.id = APP_CONTENT_ID;
  for (const id of ids) {
    const heading = document.createElement("h2");
    heading.id = id;
    root.appendChild(heading);
  }
  document.body.appendChild(root);
}

/** The observer the hook most recently created. */
function latest() {
  return ControllableIntersectionObserver.instances.at(-1)!;
}

/** What the probe currently reports, `"none"` standing in for `undefined`. */
function activeText() {
  return document.querySelector("[data-testid='active']")?.textContent;
}

beforeEach(() => {
  ControllableIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", ControllableIntersectionObserver);
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("useActiveHeading", () => {
  it("reports the heading in the band", () => {
    mountPage(["one", "two"]);
    render(<Probe ids={["one", "two"]} />);

    latest().emit([{ id: "two", isIntersecting: true }]);

    expect(activeText()).toBe("two");
  });

  it("prefers the first in document order when the band holds several", () => {
    mountPage(["one", "two"]);
    render(<Probe ids={["one", "two"]} />);

    latest().emit([
      { id: "two", isIntersecting: true },
      { id: "one", isIntersecting: true },
    ]);

    expect(activeText()).toBe("one");
  });

  it("holds the last heading when the band empties, rather than blinking off", () => {
    mountPage(["one", "two"]);
    render(<Probe ids={["one", "two"]} />);

    latest().emit([{ id: "one", isIntersecting: true }]);
    latest().emit([{ id: "one", isIntersecting: false }]);

    expect(activeText()).toBe("one");
  });

  it("moves on as one heading leaves the band and the next enters", () => {
    mountPage(["one", "two"]);
    render(<Probe ids={["one", "two"]} />);

    latest().emit([{ id: "one", isIntersecting: true }]);
    latest().emit([
      { id: "one", isIntersecting: false },
      { id: "two", isIntersecting: true },
    ]);

    expect(activeText()).toBe("two");
  });

  it("observes against the scroller, the window never being what scrolls", () => {
    mountPage(["one"]);
    render(<Probe ids={["one"]} />);

    expect(latest().options?.root).toBe(document.getElementById(APP_CONTENT_ID));
  });

  it("observes every heading it is given", () => {
    mountPage(["one", "two", "three"]);
    render(<Probe ids={["one", "two", "three"]} />);

    expect(latest().observed.map((element) => element.id)).toEqual(["one", "two", "three"]);
  });

  it("re-observes when the page changes, which changes the headings", () => {
    mountPage(["one"]);
    const { rerender } = render(<Probe ids={["one"]} />);
    const first = latest();

    document.body.innerHTML = "";
    mountPage(["other"]);
    rerender(<Probe ids={["other"]} />);

    expect(first.disconnected).toBe(true);
    expect(latest()).not.toBe(first);
    expect(latest().observed.map((element) => element.id)).toEqual(["other"]);
  });

  it("observes nothing when the page has no headings", () => {
    mountPage([]);
    render(<Probe ids={[]} />);

    expect(ControllableIntersectionObserver.instances).toHaveLength(0);
    expect(activeText()).toBe("none");
  });

  it("stays quiet where the scroller is absent, as on a page that mounts none", () => {
    render(<Probe ids={["one"]} />);

    expect(ControllableIntersectionObserver.instances).toHaveLength(0);
    expect(activeText()).toBe("none");
  });

  it("clears on a page change, rather than holding a heading the new page never had", () => {
    mountPage(["one", "two"]);
    const { rerender } = render(<Probe ids={["one", "two"]} />);
    latest().emit([{ id: "two", isIntersecting: true }]);
    expect(activeText()).toBe("two");

    // Navigating swaps the article, and the new page starts scrolled to the top of its own text.
    document.getElementById(APP_CONTENT_ID)?.remove();
    mountPage(["other"]);
    rerender(<Probe ids={["other"]} />);

    expect(activeText()).toBe("none");
  });

  it("re-observes when the page changes but lists the very same headings", () => {
    // `other-resources/science` and `.../recipes` do exactly this, so the ids cannot tell them
    // apart; without the scope the observer would keep watching the old page's detached nodes.
    mountPage(["underbelly", "dream-scoops"]);
    const { rerender } = render(<Probe ids={["underbelly", "dream-scoops"]} scope="/science" />);
    const first = latest();

    document.getElementById(APP_CONTENT_ID)?.remove();
    mountPage(["underbelly", "dream-scoops"]);
    rerender(<Probe ids={["underbelly", "dream-scoops"]} scope="/recipes" />);

    expect(first.disconnected).toBe(true);
    expect(latest()).not.toBe(first);
    expect(latest().observed.every((element) => element.isConnected)).toBe(true);
  });

  it("disconnects on unmount", () => {
    mountPage(["one"]);
    const { unmount } = render(<Probe ids={["one"]} />);

    unmount();

    expect(latest().disconnected).toBe(true);
  });
});
