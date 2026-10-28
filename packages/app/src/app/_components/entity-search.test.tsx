import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import { EntitySearch, EntitySource, filterTaggedEntries } from "@/app/_components/entity-search";
import { renderWithRetainedState } from "@/__tests__/unit/retained-state";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

interface Entry {
  name: string;
  tag: string;
}

const builtinA: Entry = { name: "Alpha", tag: "first" };
const builtinB: Entry = { name: "Beta", tag: "second" };
const savedA: Entry = { name: "Gamma", tag: "third" };
const savedB: Entry = { name: "Delta", tag: "second" };

const getId = (e: Entry) => e.name;
const matchesQuery = (e: Entry, q: string) =>
  e.name.toLowerCase().includes(q) || e.tag.toLowerCase().includes(q);

type ShellOverrides = Partial<React.ComponentProps<typeof EntitySearch<Entry>>>;

/** Minimal default element to reduce per-test boilerplate */
function shell(overrides: ShellOverrides = {}) {
  return (
    <EntitySearch<Entry>
      embeddedEntries={[builtinA, builtinB]}
      savedEntries={[savedA, savedB]}
      getId={getId}
      matchesQuery={matchesQuery}
      renderDetailPanel={(e) => <div data-testid="panel">panel for {e.name}</div>}
      {...overrides}
    />
  );
}

/** Render {@link shell} as-is, with no provider */
function renderShell(overrides: ShellOverrides = {}) {
  return render(shell(overrides));
}

// ---------------------------------------------------------------------------
// filterTaggedEntries
// ---------------------------------------------------------------------------

describe("filterTaggedEntries", () => {
  it("tags embedded and saved entries with their _source", () => {
    const tagged = filterTaggedEntries([builtinA], [savedA], EntitySource.All, "", matchesQuery);
    const byName = Object.fromEntries(tagged.map((e) => [e.name, e._source]));
    expect(byName.Alpha).toBe(EntitySource.Embedded);
    expect(byName.Gamma).toBe(EntitySource.Saved);
  });

  it("filters by source = Embedded", () => {
    const tagged = filterTaggedEntries(
      [builtinA, builtinB],
      [savedA, savedB],
      EntitySource.Embedded,
      "",
      matchesQuery,
    );
    expect(tagged.map((e) => e.name).sort()).toEqual(["Alpha", "Beta"]);
  });

  it("filters by source = Saved", () => {
    const tagged = filterTaggedEntries(
      [builtinA, builtinB],
      [savedA, savedB],
      EntitySource.Saved,
      "",
      matchesQuery,
    );
    expect(tagged.map((e) => e.name).sort()).toEqual(["Delta", "Gamma"]);
  });

  it("returns all entries when source = All and query is empty", () => {
    const tagged = filterTaggedEntries(
      [builtinA, builtinB],
      [savedA, savedB],
      EntitySource.All,
      "",
      matchesQuery,
    );
    expect(tagged).toHaveLength(4);
  });

  it("lowercases the query before passing it to matchesQuery", () => {
    const matchSpy = vi.fn(matchesQuery);
    filterTaggedEntries([builtinA], [], EntitySource.All, "ALphA", matchSpy);
    expect(matchSpy).toHaveBeenCalledWith(expect.objectContaining({ name: "Alpha" }), "alpha");
  });

  it("delegates filtering to matchesQuery", () => {
    const tagged = filterTaggedEntries(
      [builtinA, builtinB],
      [savedA, savedB],
      EntitySource.All,
      "second",
      matchesQuery,
    );
    // Beta and Delta share the "second" tag
    expect(tagged.map((e) => e.name).sort()).toEqual(["Beta", "Delta"]);
  });

  it("trims whitespace-only queries (returns the whole pool)", () => {
    const tagged = filterTaggedEntries([builtinA], [savedA], EntitySource.All, "   ", matchesQuery);
    expect(tagged).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// EntitySearch (shell only — list, selection, source filter, panel passthrough)
// ---------------------------------------------------------------------------

describe("EntitySearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  describe("structure", () => {
    it("renders the search input and source filter buttons", () => {
      renderShell();
      expect(screen.getByPlaceholderText("Search…")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Built-in" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Saved" })).toBeInTheDocument();
    });

    it("renders one list item per entry under All", () => {
      renderShell();
      expect(screen.getByRole("button", { name: /Alpha/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Beta/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Gamma/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Delta/ })).toBeInTheDocument();
    });

    it("shows the empty-detail message when no entry is selected", () => {
      renderShell({ emptyDetailText: "Pick one!" });
      expect(screen.getByText("Pick one!")).toBeInTheDocument();
    });

    it("shows the empty-results message when no entries match the query", () => {
      renderShell({ emptyResultsText: "Nothing here." });
      fireEvent.change(screen.getByPlaceholderText("Search…"), {
        target: { value: "no-such-thing" },
      });
      expect(screen.getByText("Nothing here.")).toBeInTheDocument();
    });

    it("uses getDisplayName for the list-item title when provided", () => {
      renderShell({ getDisplayName: (e) => `<<${e.name}>>` });
      expect(screen.getByRole("button", { name: /<<Alpha>>/ })).toBeInTheDocument();
    });

    it("renders the renderListItemSubtitle output under each list-item title", () => {
      renderShell({ renderListItemSubtitle: (e) => <span data-testid="subtitle">{e.tag}</span> });
      expect(screen.getAllByTestId("subtitle")).toHaveLength(4);
    });

    it("renders the renderDetailPanel output for the selected entry", () => {
      renderShell();
      fireEvent.click(screen.getByRole("button", { name: /Alpha/ }));
      expect(screen.getByTestId("panel")).toHaveTextContent("panel for Alpha");
    });

    it("marks only the selected entry's list item as current", () => {
      renderShell();
      fireEvent.click(screen.getByRole("button", { name: /Gamma/ }));

      expect(screen.getByRole("button", { name: /Gamma/ })).toHaveAttribute("aria-current", "true");
      expect(document.querySelectorAll("[aria-current]")).toHaveLength(1);
    });

    it("passes the source tag to renderDetailPanel via the entry's _source", () => {
      renderShell({ renderDetailPanel: (e) => <div data-testid="panel">{e._source}</div> });
      fireEvent.click(screen.getByRole("button", { name: /Alpha/ }));
      expect(screen.getByTestId("panel")).toHaveTextContent("embedded");
      fireEvent.click(screen.getByRole("button", { name: /Gamma/ }));
      expect(screen.getByTestId("panel")).toHaveTextContent("saved");
    });
  });

  describe("search and source filtering", () => {
    it("narrows the list to matching entries when the user types", () => {
      renderShell();
      fireEvent.change(screen.getByPlaceholderText("Search…"), { target: { value: "Alpha" } });
      expect(screen.getByRole("button", { name: /Alpha/ })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Beta/ })).not.toBeInTheDocument();
    });

    it("restricts the list when a non-All source is selected", () => {
      renderShell();
      fireEvent.click(screen.getByRole("button", { name: "Saved" }));
      expect(screen.queryByRole("button", { name: /Alpha/ })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Gamma/ })).toBeInTheDocument();
    });

    it("persists the selected source across remounts when an id is given", () => {
      localStorage.clear();
      const { unmount } = renderShell({ id: "test-search" });
      fireEvent.click(screen.getByRole("button", { name: "Saved" }));
      unmount();

      renderShell({ id: "test-search" });
      expect(screen.queryByRole("button", { name: /Alpha/ })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Gamma/ })).toBeInTheDocument();
    });
  });

  describe("retained query", () => {
    const searchInput = () => screen.getByPlaceholderText("Search…");
    const typeQuery = (value: string) => fireEvent.change(searchInput(), { target: { value } });

    it("restores the query, and the filtering it drives, after leaving and returning", () => {
      const { leaveAndReturn } = renderWithRetainedState(shell({ id: "test-search" }));
      typeQuery("Alpha");

      leaveAndReturn();

      expect(searchInput()).toHaveValue("Alpha");
      expect(screen.getByRole("button", { name: /Alpha/ })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Beta/ })).not.toBeInTheDocument();
    });

    it("keeps a separate query per id", () => {
      const { leaveAndReturn } = renderWithRetainedState(
        <>
          {shell({ id: "search-a" })}
          {shell({ id: "search-b" })}
        </>,
      );
      fireEvent.change(screen.getAllByPlaceholderText("Search…")[0], {
        target: { value: "Alpha" },
      });

      leaveAndReturn();

      const [first, second] = screen.getAllByPlaceholderText("Search…");
      expect(first).toHaveValue("Alpha");
      expect(second).toHaveValue("");
    });

    it("does not retain the query without an id", () => {
      const { leaveAndReturn } = renderWithRetainedState(shell());
      typeQuery("Alpha");

      leaveAndReturn();

      expect(searchInput()).toHaveValue("");
      expect(screen.getByRole("button", { name: /Beta/ })).toBeInTheDocument();
    });

    it("does not retain the query without a provider", () => {
      const { unmount } = renderShell({ id: "test-search" });
      typeQuery("Alpha");
      unmount();

      renderShell({ id: "test-search" });

      expect(searchInput()).toHaveValue("");
    });

    it("starts empty under a new provider, as after a reload", () => {
      const first = renderWithRetainedState(shell({ id: "test-search" }));
      typeQuery("Alpha");
      first.unmount();

      renderWithRetainedState(shell({ id: "test-search" }));

      expect(searchInput()).toHaveValue("");
    });
  });

  describe("retained selection", () => {
    const select = (name: RegExp) => fireEvent.click(screen.getByRole("button", { name }));

    it("restores the selected entry, and its panel, after leaving and returning", () => {
      const { leaveAndReturn } = renderWithRetainedState(shell({ id: "test-search" }));
      select(/Gamma/);

      leaveAndReturn();

      expect(screen.getByTestId("panel")).toHaveTextContent("panel for Gamma");
      expect(screen.getByRole("button", { name: /Gamma/ })).toHaveClass("search-list-item-active");
    });

    it("keeps a separate selection per id", () => {
      const { leaveAndReturn } = renderWithRetainedState(
        <>
          {shell({ id: "search-a" })}
          {shell({ id: "search-b" })}
        </>,
      );
      fireEvent.click(screen.getAllByRole("button", { name: /Gamma/ })[0]);

      leaveAndReturn();

      expect(screen.getByTestId("panel")).toHaveTextContent("panel for Gamma");
      expect(screen.getAllByText("Select an entry to see details")).toHaveLength(1);
    });

    it("does not retain the selection without an id", () => {
      const { leaveAndReturn } = renderWithRetainedState(shell());
      select(/Gamma/);

      leaveAndReturn();

      expect(screen.queryByTestId("panel")).not.toBeInTheDocument();
    });

    it("does not retain the selection without a provider", () => {
      const { unmount } = renderShell({ id: "test-search" });
      select(/Gamma/);
      unmount();

      renderShell({ id: "test-search" });

      expect(screen.queryByTestId("panel")).not.toBeInTheDocument();
    });

    it("starts with nothing selected under a new provider, as after a reload", () => {
      const first = renderWithRetainedState(shell({ id: "test-search" }));
      select(/Gamma/);
      first.unmount();

      renderWithRetainedState(shell({ id: "test-search" }));

      expect(screen.queryByTestId("panel")).not.toBeInTheDocument();
    });

    it("is held in memory only, never in localStorage", () => {
      renderWithRetainedState(shell({ id: "test-search" }));
      select(/Gamma/);

      expect(Object.keys(localStorage).some((key) => key.endsWith(":entry"))).toBe(false);
    });
  });

  describe("stale selection", () => {
    it("clears the selection once the selected entry drops out of the data (e.g. deleted)", () => {
      const { rerender } = renderShell();
      fireEvent.click(screen.getByRole("button", { name: /Gamma/ }));
      expect(screen.getByTestId("panel")).toHaveTextContent("panel for Gamma");

      // Simulate the parent refreshing its data after the entry is deleted server-side.
      rerender(
        <EntitySearch<Entry>
          embeddedEntries={[builtinA, builtinB]}
          savedEntries={[savedB]}
          getId={getId}
          matchesQuery={matchesQuery}
          renderDetailPanel={(e) => <div data-testid="panel">panel for {e.name}</div>}
        />,
      );

      expect(screen.queryByTestId("panel")).not.toBeInTheDocument();
      expect(screen.getByText("Select an entry to see details")).toBeInTheDocument();
    });

    it("keeps the selection when the entry is still present after a data refresh", () => {
      const { rerender } = renderShell();
      fireEvent.click(screen.getByRole("button", { name: /Gamma/ }));
      expect(screen.getByTestId("panel")).toHaveTextContent("panel for Gamma");

      rerender(
        <EntitySearch<Entry>
          embeddedEntries={[builtinA, builtinB]}
          savedEntries={[savedA, savedB]}
          getId={getId}
          matchesQuery={matchesQuery}
          renderDetailPanel={(e) => <div data-testid="panel">panel for {e.name}</div>}
        />,
      );

      expect(screen.getByTestId("panel")).toHaveTextContent("panel for Gamma");
    });
  });
});
