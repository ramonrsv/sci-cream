import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

import { BatchList } from "@/app/_elements/batch-list";
import type { SavedBatchJson } from "@/lib/data";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** A saved batch with a title and two recipes, enough to exercise the legend and count. */
const SAVED: SavedBatchJson = {
  id: 3,
  title: "Sunday batch",
  date: "2026-07-19",
  recipes: [
    { name: "Vanilla", rows: [["Whole Milk", 600]], color: "Blue" },
    { name: "Sorbet", rows: [["Sugar", 100]] },
  ],
  createdAt: "",
  updatedAt: "",
};

describe("BatchList", () => {
  it("shows an empty message with no batches", () => {
    render(<BatchList batches={[]} onLoad={() => undefined} emptyMessage="Nothing here" />);
    expect(screen.getByTestId("batch-list-empty")).toHaveTextContent("Nothing here");
  });

  it("renders each batch with its title, date, recipe count, and legend", () => {
    render(<BatchList batches={[SAVED]} onLoad={() => undefined} />);

    expect(screen.getByTestId("batch-open-3")).toHaveTextContent("Sunday batch");
    expect(screen.getByText("2026-07-19")).toBeInTheDocument();
    expect(screen.getByText("2 recipes")).toBeInTheDocument();
    // The legend names each recipe, so a batch is identifiable without opening it.
    expect(screen.getByText("Vanilla")).toBeInTheDocument();
    expect(screen.getByText("Sorbet")).toBeInTheDocument();
  });

  it("singularizes the recipe count for a lone recipe", () => {
    render(
      <BatchList batches={[{ ...SAVED, recipes: [SAVED.recipes[0]] }]} onLoad={() => undefined} />,
    );
    expect(screen.getByText("1 recipe")).toBeInTheDocument();
  });

  it("invokes onLoad when the title is clicked", () => {
    const onLoad = vi.fn();
    render(<BatchList batches={[SAVED]} onLoad={onLoad} />);

    fireEvent.click(screen.getByTestId("batch-open-3"));
    expect(onLoad).toHaveBeenCalledWith(SAVED);
  });

  it("marks the selected batch as the one being edited", () => {
    const other: SavedBatchJson = { ...SAVED, id: 4, title: "Other batch" };
    render(<BatchList batches={[SAVED, other]} onLoad={() => undefined} selectedId={3} />);

    expect(screen.getByTestId("batch-list-item-3")).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId("batch-list-item-4")).not.toHaveAttribute("aria-current");
  });

  it("shows a recipe's opted-in version label, not its raw number, from the persisted snapshot", () => {
    const withVersion: SavedBatchJson = {
      ...SAVED,
      recipes: [
        {
          name: "Vanilla",
          rows: [["Whole Milk", 600]],
          version: { ref: { recipeId: 5, versionNumber: 2 }, name: "2.1", hasSiblings: true },
        },
      ],
    };

    render(<BatchList batches={[withVersion]} onLoad={() => undefined} />);

    expect(screen.getByTestId("version-badge-v2.1")).toBeInTheDocument();
  });

  it("marks a favourited batch, so the star shows without opening it", () => {
    render(<BatchList batches={[{ ...SAVED, favourite: true }]} onLoad={() => undefined} />);
    expect(screen.getByTestId("favourite-marker")).toBeInTheDocument();
  });

  it("leaves an unstarred batch unmarked", () => {
    render(<BatchList batches={[SAVED]} onLoad={() => undefined} />);
    expect(screen.queryByTestId("favourite-marker")).not.toBeInTheDocument();
  });
});
