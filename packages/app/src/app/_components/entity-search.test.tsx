import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";

import { EntitySearch, EntitySource, filterTaggedEntries } from "@/app/_components/entity-search";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

interface Entry {
  name: string;
  tag: string;
  comments?: string;
}

const builtinA: Entry = { name: "Alpha", tag: "first", comments: "alpha notes" };
const builtinB: Entry = { name: "Beta", tag: "second" };
const savedA: Entry = { name: "Gamma", tag: "third", comments: "gamma notes" };
const savedB: Entry = { name: "Delta", tag: "second" };

const getId = (e: Entry) => e.name;
const matchesQuery = (e: Entry, q: string) =>
  e.name.toLowerCase().includes(q) || e.tag.toLowerCase().includes(q);

/** Minimal default render to reduce per-test boilerplate */
function renderShell(overrides: Partial<React.ComponentProps<typeof EntitySearch<Entry>>> = {}) {
  return render(
    <EntitySearch<Entry>
      embeddedEntries={[builtinA, builtinB]}
      savedEntries={[savedA, savedB]}
      getId={getId}
      matchesQuery={matchesQuery}
      renderDetailBody={(e) => <div data-testid="body">body for {e.name}</div>}
      {...overrides}
    />,
  );
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
// EntitySearch
// ---------------------------------------------------------------------------

describe("EntitySearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    it("renders the renderHeaderMeta output and a source badge in the detail header", () => {
      renderShell({ renderHeaderMeta: (e) => <span data-testid="header-meta">tag: {e.tag}</span> });
      fireEvent.click(screen.getByRole("button", { name: /Alpha/ }));
      expect(screen.getByTestId("header-meta")).toHaveTextContent("tag: first");
      expect(screen.getByText("built-in")).toBeInTheDocument();
    });

    it("renders the renderDetailBody output for the selected entry", () => {
      renderShell();
      fireEvent.click(screen.getByRole("button", { name: /Alpha/ }));
      expect(screen.getByTestId("body")).toHaveTextContent("body for Alpha");
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
  });

  describe("delete", () => {
    it("does not show a delete button for an embedded entry even with onDelete", () => {
      renderShell({ onDelete: vi.fn() });
      fireEvent.click(screen.getByRole("button", { name: /Alpha/ }));
      expect(screen.queryByLabelText("Delete saved entry")).not.toBeInTheDocument();
    });

    it("shows the default-labelled delete button for a saved entry when onDelete is provided", () => {
      renderShell({ onDelete: vi.fn() });
      fireEvent.click(screen.getByRole("button", { name: /Gamma/ }));
      expect(screen.getByLabelText("Delete saved entry")).toBeInTheDocument();
    });

    it("uses the custom deleteLabel when provided", () => {
      renderShell({ onDelete: vi.fn(), deleteLabel: "Remove this thing" });
      fireEvent.click(screen.getByRole("button", { name: /Gamma/ }));
      expect(screen.getByLabelText("Remove this thing")).toBeInTheDocument();
    });

    it("calls onDelete with the entry when confirm() returns true", async () => {
      const onDelete = vi.fn();
      vi.spyOn(window, "confirm").mockReturnValue(true);
      renderShell({ onDelete });
      fireEvent.click(screen.getByRole("button", { name: /Gamma/ }));
      fireEvent.click(screen.getByLabelText("Delete saved entry"));
      expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ name: "Gamma" }));
    });

    it("uses the custom getDeleteConfirmText for the confirm() prompt", () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
      renderShell({ onDelete: vi.fn(), getDeleteConfirmText: (e) => `Really nuke ${e.name}?` });
      fireEvent.click(screen.getByRole("button", { name: /Gamma/ }));
      fireEvent.click(screen.getByLabelText("Delete saved entry"));
      expect(confirmSpy).toHaveBeenCalledWith("Really nuke Gamma?");
    });
  });

  describe("load", () => {
    it("does not show the load button when onLoad is absent", () => {
      renderShell();
      fireEvent.click(screen.getByRole("button", { name: /Alpha/ }));
      expect(screen.queryByRole("button", { name: "Load" })).not.toBeInTheDocument();
    });

    it("shows the load button with default label when onLoad is provided", () => {
      renderShell({ onLoad: vi.fn() });
      fireEvent.click(screen.getByRole("button", { name: /Alpha/ }));
      expect(screen.getByRole("button", { name: "Load" })).toBeInTheDocument();
    });

    it("uses the custom loadButtonLabel when provided", () => {
      renderShell({ onLoad: vi.fn(), loadButtonLabel: "Use this" });
      fireEvent.click(screen.getByRole("button", { name: /Alpha/ }));
      expect(screen.getByRole("button", { name: "Use this" })).toBeInTheDocument();
    });

    it("does not show a slot picker when slots has 0 or 1 entries", () => {
      const { container } = renderShell({ onLoad: vi.fn(), slots: [0] });
      fireEvent.click(screen.getByRole("button", { name: /Alpha/ }));
      const headerSelects = within(container.querySelector(".search-detail-panel")!).queryAllByRole(
        "combobox",
      );
      expect(headerSelects).toHaveLength(0);
    });

    it("shows a slot picker labelled via slotLabel when slots has more than one entry", () => {
      renderShell({ onLoad: vi.fn(), slots: [0, 1], slotLabel: (s) => `Slot ${s}` });
      fireEvent.click(screen.getByRole("button", { name: /Alpha/ }));
      expect(screen.getByRole("option", { name: "Slot 0" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Slot 1" })).toBeInTheDocument();
    });

    it("calls onLoad with the entry and the selected slot", () => {
      const onLoad = vi.fn();
      renderShell({ onLoad, slots: [0, 1], slotLabel: (s) => `Slot ${s}` });
      fireEvent.click(screen.getByRole("button", { name: /Alpha/ }));
      fireEvent.change(screen.getByRole("combobox"), { target: { value: "1" } });
      fireEvent.click(screen.getByRole("button", { name: "Load" }));
      expect(onLoad).toHaveBeenCalledWith(expect.objectContaining({ name: "Alpha" }), 1);
    });
  });

  describe("comments", () => {
    it("renders the editable textarea for a saved entry when onUpdateComments is provided", () => {
      renderShell({ getComments: (e) => e.comments, onUpdateComments: vi.fn() });
      fireEvent.click(screen.getByRole("button", { name: /Gamma/ }));
      const textarea = screen.getByLabelText("Entry comments") as HTMLTextAreaElement;
      expect(textarea.value).toBe("gamma notes");
    });

    it("uses the custom commentsLabel when provided", () => {
      renderShell({
        getComments: (e) => e.comments,
        onUpdateComments: vi.fn(),
        commentsLabel: "Thing comments",
      });
      fireEvent.click(screen.getByRole("button", { name: /Gamma/ }));
      expect(screen.getByLabelText("Thing comments")).toBeInTheDocument();
    });

    it("calls onUpdateComments with the new value on Save", () => {
      const onUpdate = vi.fn();
      renderShell({ getComments: (e) => e.comments, onUpdateComments: onUpdate });
      fireEvent.click(screen.getByRole("button", { name: /Gamma/ }));
      fireEvent.change(screen.getByLabelText("Entry comments"), { target: { value: "edited" } });
      fireEvent.click(screen.getByRole("button", { name: "Save comments" }));
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ name: "Gamma" }), "edited");
    });

    it("renders comments read-only for built-in entries even when onUpdateComments is set", () => {
      renderShell({ getComments: (e) => e.comments, onUpdateComments: vi.fn() });
      fireEvent.click(screen.getByRole("button", { name: /Alpha/ }));
      expect(screen.queryByLabelText("Entry comments")).not.toBeInTheDocument();
      expect(screen.getByText("alpha notes")).toBeInTheDocument();
    });
  });
});
