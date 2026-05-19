import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import {
  DeleteAction,
  DetailPanelHeader,
  EditableComments,
  LoadAction,
} from "@/app/_components/detail-panel";
import { EntitySource } from "@/app/_components/entity-search";

afterEach(() => cleanup());

// ---------------------------------------------------------------------------
// DetailPanelHeader
// ---------------------------------------------------------------------------

describe("DetailPanelHeader", () => {
  it("renders the title as a heading", () => {
    render(<DetailPanelHeader title="My Thing" source={EntitySource.Embedded} />);
    expect(screen.getByRole("heading", { name: "My Thing" })).toBeInTheDocument();
  });

  it("shows the 'built-in' source tag for Embedded entries", () => {
    render(<DetailPanelHeader title="X" source={EntitySource.Embedded} />);
    expect(screen.getByText("built-in")).toBeInTheDocument();
  });

  it("shows the 'saved' source tag for Saved entries", () => {
    render(<DetailPanelHeader title="X" source={EntitySource.Saved} />);
    expect(screen.getByText("saved")).toBeInTheDocument();
  });

  it("renders meta content next to the source tag", () => {
    render(
      <DetailPanelHeader
        title="X"
        source={EntitySource.Embedded}
        meta={<span data-testid="meta">extra</span>}
      />,
    );
    expect(screen.getByTestId("meta")).toHaveTextContent("extra");
  });

  it("renders children as right-side action content", () => {
    render(
      <DetailPanelHeader title="X" source={EntitySource.Embedded}>
        <button data-testid="action">Do thing</button>
      </DetailPanelHeader>,
    );
    expect(screen.getByTestId("action")).toBeInTheDocument();
  });

  it("does not render the actions container when no children are passed", () => {
    const { container } = render(<DetailPanelHeader title="X" source={EntitySource.Embedded} />);
    // The actions container has shrink-0; absence of that class means no actions rendered
    expect(container.querySelector(".shrink-0")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// LoadAction
// ---------------------------------------------------------------------------

describe("LoadAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders a button with the default label 'Load'", () => {
    render(<LoadAction onLoad={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Load" })).toBeInTheDocument();
  });

  it("uses a custom label when provided", () => {
    render(<LoadAction onLoad={vi.fn()} label="Use this" />);
    expect(screen.getByRole("button", { name: "Use this" })).toBeInTheDocument();
  });

  it("does not show a slot picker when slots is undefined", () => {
    render(<LoadAction onLoad={vi.fn()} />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("does not show a slot picker when slots has a single entry", () => {
    render(<LoadAction onLoad={vi.fn()} slots={[0]} />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("shows a slot picker when slots has more than one entry", () => {
    render(<LoadAction onLoad={vi.fn()} slots={[0, 1, 2]} slotLabel={(s) => `Slot ${s}`} />);
    expect(screen.getByRole("option", { name: "Slot 0" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Slot 1" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Slot 2" })).toBeInTheDocument();
  });

  it("falls back to the numeric slot value when slotLabel is not provided", () => {
    render(<LoadAction onLoad={vi.fn()} slots={[0, 1]} />);
    expect(screen.getByRole("option", { name: "0" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "1" })).toBeInTheDocument();
  });

  it("calls onLoad with the first slot by default", () => {
    const onLoad = vi.fn();
    render(<LoadAction onLoad={onLoad} slots={[3, 4]} />);
    fireEvent.click(screen.getByRole("button", { name: "Load" }));
    expect(onLoad).toHaveBeenCalledWith(3);
  });

  it("calls onLoad with the user-selected slot after they change the picker", () => {
    const onLoad = vi.fn();
    render(<LoadAction onLoad={onLoad} slots={[0, 1, 2]} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Load" }));
    expect(onLoad).toHaveBeenCalledWith(2);
  });

  it("calls onLoad with 0 when no slots are provided", () => {
    const onLoad = vi.fn();
    render(<LoadAction onLoad={onLoad} />);
    fireEvent.click(screen.getByRole("button", { name: "Load" }));
    expect(onLoad).toHaveBeenCalledWith(0);
  });
});

// ---------------------------------------------------------------------------
// DeleteAction
// ---------------------------------------------------------------------------

describe("DeleteAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders a button with the default 'Delete' aria-label", () => {
    render(<DeleteAction onDelete={vi.fn()} confirmText="?" />);
    expect(screen.getByLabelText("Delete")).toBeInTheDocument();
  });

  it("uses a custom label when provided", () => {
    render(<DeleteAction onDelete={vi.fn()} confirmText="?" label="Nuke it" />);
    expect(screen.getByLabelText("Nuke it")).toBeInTheDocument();
  });

  it("calls window.confirm with confirmText before invoking onDelete", () => {
    const onDelete = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<DeleteAction onDelete={onDelete} confirmText="Really delete X?" />);
    fireEvent.click(screen.getByLabelText("Delete"));
    expect(confirmSpy).toHaveBeenCalledWith("Really delete X?");
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("does not invoke onDelete when confirm returns false", () => {
    const onDelete = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<DeleteAction onDelete={onDelete} confirmText="?" />);
    fireEvent.click(screen.getByLabelText("Delete"));
    expect(onDelete).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// EditableComments
// ---------------------------------------------------------------------------

describe("EditableComments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("seeds the textarea from initialValue", () => {
    render(<EditableComments initialValue="hello" onSave={vi.fn()} />);
    const textarea = screen.getByLabelText("Comments") as HTMLTextAreaElement;
    expect(textarea.value).toBe("hello");
  });

  it("uses the provided ariaLabel", () => {
    render(<EditableComments initialValue="" onSave={vi.fn()} ariaLabel="Recipe comments" />);
    expect(screen.getByLabelText("Recipe comments")).toBeInTheDocument();
  });

  it("renders the placeholder when the textarea is empty", () => {
    render(<EditableComments initialValue="" onSave={vi.fn()} placeholder="Type here…" />);
    expect(screen.getByPlaceholderText("Type here…")).toBeInTheDocument();
  });

  it("tracks edits locally and calls onSave with the latest value", () => {
    const onSave = vi.fn();
    render(<EditableComments initialValue="" onSave={onSave} />);
    fireEvent.change(screen.getByLabelText("Comments"), { target: { value: "edited" } });
    fireEvent.click(screen.getByRole("button", { name: "Save comments" }));
    expect(onSave).toHaveBeenCalledWith("edited");
  });

  it("does not reseed the textarea when initialValue changes after mount (consumer must remount)", () => {
    const { rerender } = render(<EditableComments initialValue="first" onSave={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Comments"), { target: { value: "edited" } });
    rerender(<EditableComments initialValue="second" onSave={vi.fn()} />);
    const textarea = screen.getByLabelText("Comments") as HTMLTextAreaElement;
    expect(textarea.value).toBe("edited");
  });

  it("seeds from the new initialValue when remounted via key change", () => {
    const { rerender } = render(<EditableComments key="a" initialValue="first" onSave={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Comments"), { target: { value: "edited" } });
    rerender(<EditableComments key="b" initialValue="second" onSave={vi.fn()} />);
    const textarea = screen.getByLabelText("Comments") as HTMLTextAreaElement;
    expect(textarea.value).toBe("second");
  });
});
