import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { ListDetailShell } from "@/app/_elements/list-detail-shell";

/** Height of the list column's view, and of each item, in the stubbed layout. */
const VIEW_HEIGHT = 100;
const ITEM_HEIGHT = 20;

/** Twenty items stacked from the top, so the list runs to 400px against a 100px view. */
const ITEMS = Array.from({ length: 20 }, (_, idx) => idx);

/** A minimal box at `top`, as `getBoundingClientRect` reports it. */
function rect(top: number, height: number): DOMRect {
  return {
    top,
    bottom: top + height,
    height,
    y: top,
    left: 0,
    right: 100,
    width: 100,
    x: 0,
    toJSON: () => ({}),
  };
}

/**
 * Stub the layout jsdom doesn't compute: the list column, like every element without a `data-top`,
 * shows 0 to {@link VIEW_HEIGHT}, and each item sits at its `data-top` less the column's scroll.
 */
function stubLayout() {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const top = this.getAttribute("data-top");
    if (top === null) return rect(0, VIEW_HEIGHT);
    return rect(Number(top) - (this.parentElement?.scrollTop ?? 0), ITEM_HEIGHT);
  });
  vi.spyOn(Element.prototype, "clientHeight", "get").mockReturnValue(VIEW_HEIGHT);
}

/** The shell with {@link ITEMS} listed, `current` marked with `aria-current`. */
function shell(current?: number) {
  return (
    <ListDetailShell
      query=""
      onQueryChange={() => undefined}
      list={ITEMS.map((idx) => (
        <div
          key={idx}
          data-testid={`item-${String(idx)}`}
          data-top={idx * ITEM_HEIGHT}
          aria-current={idx === current ? "true" : undefined}
        >
          Item {idx}
        </div>
      ))}
      detail={null}
    />
  );
}

/** The scrolling list column, the items' parent. */
function listColumn(): HTMLElement {
  const column = screen.getByTestId("item-0").parentElement;
  expect(column).not.toBeNull();
  return column as HTMLElement;
}

beforeEach(() => {
  stubLayout();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ListDetailShell current item", () => {
  it("centres a current item that is out of view on mount", () => {
    render(shell(15));

    // Item 15 spans 300–320; centring it in the 100px view leaves (100 - 20) / 2 above it
    expect(listColumn().scrollTop).toBe(260);
  });

  it("leaves the list alone when the current item is already in view", () => {
    render(shell(2));

    expect(listColumn().scrollTop).toBe(0);
  });

  it("reveals an item that becomes current on a later render", () => {
    const { rerender } = render(shell());
    expect(listColumn().scrollTop).toBe(0);

    rerender(shell(15));

    expect(listColumn().scrollTop).toBe(260);
  });

  it("does not scroll back to the same current item after the user scrolls away", () => {
    const { rerender } = render(shell(15));
    listColumn().scrollTop = 0;

    rerender(shell(15));

    expect(listColumn().scrollTop).toBe(0);
  });
});
