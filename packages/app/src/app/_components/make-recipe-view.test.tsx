import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { useSession } from "next-auth/react";

import { MakeRecipeView } from "./make-recipe-view";
import { type Batch, batchChecklistKey, cellKey } from "@/lib/batch/batch";
import {
  MAX_BATCH_ENCODED_CHARS,
  BATCH_PAYLOAD_VERSION,
  encodeBatchPayload,
  makeBatchPayload,
  type BatchPayload,
} from "@/lib/batch/share";
import { type SavedRecipeJson } from "@/lib/data/recipes";
import {
  createUserBatch,
  updateUserBatch,
  deleteUserBatch,
  setUserBatchFavourite,
  type SavedBatchJson,
} from "@/lib/data/batches";
import { useSessionResources, type SessionResources } from "@/lib/resources/session";
import {
  getSelectOptionLabelsByLabel,
  getSelectedOptionLabelByLabel,
  selectOptionByLabel,
} from "@/__tests__/unit/select";
import { STORAGE_KEYS, getLocalStorage, setLocalStorage } from "@/lib/local-storage";
import { CategoryColor } from "@/lib/styles/colors";

vi.mock("next-auth/react", () => ({ useSession: vi.fn() }));
vi.mock("@/lib/resources/session", () => ({ useSessionResources: vi.fn() }));
vi.mock("@/lib/data/batches", () => ({
  createUserBatch: vi.fn(),
  updateUserBatch: vi.fn(),
  deleteUserBatch: vi.fn(),
  setUserBatchFavourite: vi.fn(),
}));

/** Point `useSession` at a signed-in user, or `null` for signed-out (the default). */
function setSessionEmail(email: string | null) {
  vi.mocked(useSession).mockReturnValue({
    data: email === null ? null : { user: { email }, expires: "" },
    status: email === null ? "unauthenticated" : "authenticated",
    update: vi.fn(),
  } as unknown as ReturnType<typeof useSession>);
}

/** Point `useSessionResources` at the given saved batches and recipes; the rest are stubs. */
function setSavedBatches(savedBatches: SavedBatchJson[], savedRecipes: SavedRecipeJson[] = []) {
  vi.mocked(useSessionResources).mockReturnValue({
    wasmResourcesState: [] as unknown as SessionResources["wasmResourcesState"],
    userIngredientSpecs: [],
    savedRecipes,
    savedBatches,
    refreshUserIngredients: vi.fn().mockResolvedValue(undefined),
    refreshUserRecipes: vi.fn().mockResolvedValue(undefined),
    refreshUserBatches: vi.fn().mockResolvedValue(undefined),
  });
}

/** A two-recipe batch sharing "Sucrose", so merging is exercised by default. */
const BATCH: Batch = {
  title: "Test batch",
  date: "2026-07-18",
  recipes: [
    {
      name: "Strawberry Sorbet",
      rows: [
        ["Strawberry", 300],
        ["Sucrose", 100],
      ],
    },
    {
      name: "Vanilla Base",
      rows: [
        ["Whole Milk", 500],
        ["Sucrose", 120],
      ],
    },
  ],
};

/** Set the URL fragment and render; decoding is async, so callers must `find*`. */
function renderWithHash(encoded: string) {
  window.location.hash = `#${encoded}`;
  return render(<MakeRecipeView />);
}

/** Encode an arbitrary value through the real pipeline, bypassing payload validation. */
async function encodeRaw(value: unknown): Promise<string> {
  return encodeBatchPayload(value as BatchPayload);
}

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "";
  window.history.replaceState(null, "", "/");
  vi.clearAllMocks();
  setSessionEmail(null);
  setSavedBatches([]);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("MakeRecipeView — link mode", () => {
  it("renders the shared batch: title, date, legend, and merged checklist", async () => {
    await renderWithHash(await encodeBatchPayload(makeBatchPayload(BATCH)));

    expect(await screen.findByTestId("make-recipe-view")).toBeInTheDocument();
    expect(screen.getByText("Test batch")).toBeInTheDocument();
    expect(screen.getByText("2026-07-18")).toBeInTheDocument();
    expect(screen.getByText("shared checklist")).toBeInTheDocument();

    // Legend maps each badge letter to its recipe name, so coding is never color-alone
    expect(screen.getByText("Strawberry Sorbet")).toBeInTheDocument();
    expect(screen.getByText("Vanilla Base")).toBeInTheDocument();

    // Merged row for the shared ingredient carries both cells and the summed total
    const sucrose = screen.getByTestId("checklist-row-Sucrose");
    expect(sucrose).toBeInTheDocument();
    // Anchored: amounts are unitless now that the column header carries the "g", so an unanchored
    // "100" would also be satisfied by "1000".
    expect(screen.getByTestId("checklist-total-Sucrose")).toHaveTextContent(/^220$/);
    expect(screen.getByTestId("checklist-cell-0-Sucrose")).toHaveTextContent(/^100$/);
    expect(screen.getByTestId("checklist-cell-1-Sucrose")).toHaveTextContent(/^120$/);
  });

  it("hides the owner controls, since a recipient cannot edit the batch", async () => {
    await renderWithHash(await encodeBatchPayload(makeBatchPayload(BATCH)));
    await screen.findByTestId("make-recipe-view");

    expect(screen.queryByTestId("batch-builder")).not.toBeInTheDocument();
    expect(screen.queryByTestId("share-batch-button")).not.toBeInTheDocument();
  });

  it("shows the batch notes when the link carries them", async () => {
    const withNotes = { ...BATCH, notes: "Age 12 h at 4 °C." };
    await renderWithHash(await encodeBatchPayload(makeBatchPayload(withNotes)));
    await screen.findByTestId("make-recipe-view");

    expect(screen.getByText("Age 12 h at 4 °C.")).toBeInTheDocument();
  });

  it("tracks progress as cells are checked off", async () => {
    await renderWithHash(await encodeBatchPayload(makeBatchPayload(BATCH)));
    await screen.findByTestId("make-recipe-view");

    // Strawberry, Sucrose x2, Whole Milk = 4 cells
    expect(screen.getByTestId("batch-progress")).toHaveTextContent("0 of 4 weighed");

    fireEvent.click(screen.getByTestId("checklist-cell-0-Sucrose"));
    expect(screen.getByTestId("batch-progress")).toHaveTextContent("1 of 4 weighed");
    expect(screen.getByTestId("checklist-cell-0-Sucrose")).toHaveAttribute("aria-checked", "true");

    // The row is only done once every contributing recipe's cell is checked
    expect(screen.getByTestId("checklist-row-Sucrose")).toHaveAttribute("data-done", "false");
    fireEvent.click(screen.getByTestId("checklist-cell-1-Sucrose"));
    expect(screen.getByTestId("checklist-row-Sucrose")).toHaveAttribute("data-done", "true");
  });

  it("restores progress stored under the batch's content hash", async () => {
    setLocalStorage(batchChecklistKey(BATCH), [cellKey("Strawberry", 0)]);
    await renderWithHash(await encodeBatchPayload(makeBatchPayload(BATCH)));
    await screen.findByTestId("make-recipe-view");

    // The view renders as soon as the batch decodes, but restoring the stored set is a further
    // effect keyed on the checklist hash, so the checkmarks land a commit later.
    await waitFor(() => {
      expect(screen.getByTestId("checklist-cell-0-Strawberry")).toHaveAttribute(
        "aria-checked",
        "true",
      );
    });
    expect(screen.getByTestId("batch-progress")).toHaveTextContent("1 of 4 weighed");
  });

  it("does not see a different batch's progress", async () => {
    const other: Batch = { ...BATCH, recipes: [{ name: "Other", rows: [["Sucrose", 999]] }] };
    // Progress of this batch's own, on a cell the other batch does not carry. It is the witness
    // that the restore actually ran: without it, an unchecked Sucrose would also be what a restore
    // that never happened looks like, and the assertion below would hold for the wrong reason.
    //
    // Seeded first on purpose. Were the two batches to hash alike, the other's write would land on
    // the same key and bury this one, and the witness would fail — which is the point.
    setLocalStorage(batchChecklistKey(BATCH), [cellKey("Strawberry", 0)]);
    setLocalStorage(batchChecklistKey(other), [cellKey("Sucrose", 0)]);

    await renderWithHash(await encodeBatchPayload(makeBatchPayload(BATCH)));
    await screen.findByTestId("make-recipe-view");
    await waitFor(() => {
      expect(screen.getByTestId("checklist-cell-0-Strawberry")).toHaveAttribute(
        "aria-checked",
        "true",
      );
    });

    expect(screen.getByTestId("checklist-cell-0-Sucrose")).toHaveAttribute("aria-checked", "false");
  });

  it("records the checklist in the eviction index", async () => {
    await renderWithHash(await encodeBatchPayload(makeBatchPayload(BATCH)));
    await screen.findByTestId("make-recipe-view");

    // Recording the batch is an effect too, so it lands a commit after the view appears
    await waitFor(() => {
      const index = localStorage.getItem(`${STORAGE_KEYS.makeRecipeChecklist}:index`);
      expect(index).toContain(batchChecklistKey(BATCH));
    });
  });
});

describe("MakeRecipeView — invalid links", () => {
  // Every case drives a decode failure that logs an expected `make-recipe:` error; swallow it.
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => consoleErrorSpy.mockRestore());

  it("shows a checklist-specific error and no partial checklist", async () => {
    await renderWithHash("not-a-payload");

    const error = await screen.findByTestId("make-recipe-error");
    expect(error).toHaveTextContent(/checklist link/);
    expect(screen.queryByTestId("batch-checklist")).not.toBeInTheDocument();
  });

  it("reports an over-long fragment without attempting to decode it", async () => {
    await renderWithHash("A".repeat(MAX_BATCH_ENCODED_CHARS + 1));

    expect(await screen.findByTestId("make-recipe-error")).toHaveTextContent(
      /maximum supported size/,
    );
  });

  it("reports a newer payload version as such", async () => {
    const encoded = await encodeRaw({
      v: BATCH_PAYLOAD_VERSION + 1,
      d: "2026-07-18",
      b: [{ n: "A", r: [["Sucrose", 1]] }],
    });
    await renderWithHash(encoded);

    expect(await screen.findByTestId("make-recipe-error")).toHaveTextContent(/newer version/);
  });
});

describe("MakeRecipeView — owner mode", () => {
  it("shows the builder and an empty checklist when there is no fragment", async () => {
    render(<MakeRecipeView />);

    expect(await screen.findByTestId("batch-builder")).toBeInTheDocument();
    expect(screen.getByTestId("checklist-empty")).toBeInTheDocument();
    expect(screen.queryByText("shared checklist")).not.toBeInTheDocument();
  });

  it("offers calculator slots holding rows as batch sources", async () => {
    setLocalStorage(STORAGE_KEYS.recipeStores, [
      { name: "My Gelato", serializedRows: "Whole Milk\t500\nSucrose\t100" },
      { name: "", serializedRows: "" },
    ]);
    render(<MakeRecipeView />);
    await screen.findByTestId("batch-builder");

    const picker = screen.getByTestId("batch-add-recipe");
    expect(picker).toHaveTextContent("My Gelato");
    // The empty slot contributes nothing to weigh, so it is not offered
    expect(picker).not.toHaveTextContent("Ref A");
  });

  it("builds a checklist from a chosen slot and disables sharing until then", async () => {
    setLocalStorage(STORAGE_KEYS.recipeStores, [
      { name: "My Gelato", serializedRows: "Whole Milk\t500\nSucrose\t100" },
    ]);
    render(<MakeRecipeView />);
    await screen.findByTestId("batch-builder");

    expect(screen.getByTestId("share-batch-button")).toBeDisabled();

    fireEvent.change(screen.getByTestId("batch-add-recipe"), { target: { value: "slot:0" } });

    // One recipe, so there is no total column; the amount lives in that recipe's own cell
    expect(screen.getByTestId("checklist-cell-0-Whole Milk")).toHaveTextContent(/^500$/);
    expect(screen.getByTestId("share-batch-button")).toBeEnabled();
  });

  it("keeps weighing progress when the title or notes change", async () => {
    setLocalStorage(STORAGE_KEYS.recipeStores, [
      { name: "My Gelato", serializedRows: "Whole Milk\t500" },
    ]);
    render(<MakeRecipeView />);
    await screen.findByTestId("batch-builder");

    fireEvent.change(screen.getByTestId("batch-add-recipe"), { target: { value: "slot:0" } });
    fireEvent.click(screen.getByTestId("checklist-cell-0-Whole Milk"));
    expect(screen.getByTestId("batch-progress")).toHaveTextContent("1 of 1 weighed");

    fireEvent.change(screen.getByTestId("batch-notes"), { target: { value: "Churn cold." } });
    expect(screen.getByTestId("batch-progress")).toHaveTextContent("1 of 1 weighed");

    fireEvent.change(screen.getByTestId("batch-title"), { target: { value: "Renamed" } });
    expect(screen.getByTestId("batch-progress")).toHaveTextContent("1 of 1 weighed");
  });

  it("resets weighing progress when the amounts change", async () => {
    // Same name and ingredient in both slots, so swapping one for the other changes the amount
    // and nothing else — otherwise a differing recipe name would also move the checklist hash.
    setLocalStorage(STORAGE_KEYS.recipeStores, [
      { name: "My Gelato", serializedRows: "Whole Milk\t500" },
      { name: "My Gelato", serializedRows: "Whole Milk\t1000" },
    ]);
    render(<MakeRecipeView />);
    await screen.findByTestId("batch-builder");

    fireEvent.change(screen.getByTestId("batch-add-recipe"), { target: { value: "slot:0" } });
    fireEvent.click(screen.getByTestId("checklist-cell-0-Whole Milk"));
    expect(screen.getByTestId("batch-progress")).toHaveTextContent("1 of 1 weighed");

    fireEvent.click(screen.getByTestId("builder-remove-0"));
    fireEvent.change(screen.getByTestId("batch-add-recipe"), { target: { value: "slot:1" } });
    expect(screen.getByTestId("checklist-cell-0-Whole Milk")).toHaveTextContent(/^1000$/);
    expect(screen.getByTestId("batch-progress")).toHaveTextContent("0 of 1 weighed");
  });

  // Resolved when the recipe joins the batch, not when it is drawn: only then does the color the
  // owner sees ride the link, instead of the recipient recomputing one from their own sequence.
  it("snapshots the recipe with a concrete color into the selection as it is added", async () => {
    setLocalStorage(STORAGE_KEYS.recipeStores, [
      { name: "My Gelato", serializedRows: "Whole Milk\t500" },
    ]);
    render(<MakeRecipeView />);
    await screen.findByTestId("batch-builder");

    fireEvent.change(screen.getByTestId("batch-add-recipe"), { target: { value: "slot:0" } });

    expect(getLocalStorage(STORAGE_KEYS.makeRecipeBatch)).toMatchObject({
      items: [
        { color: CategoryColor.Blue, recipe: { name: "My Gelato", rows: [["Whole Milk", 500]] } },
      ],
    });
  });

  it("makes a picked color the default for that position in the next batch", async () => {
    setLocalStorage(STORAGE_KEYS.recipeStores, [
      { name: "My Gelato", serializedRows: "Whole Milk\t500" },
    ]);
    render(<MakeRecipeView />);
    await screen.findByTestId("batch-builder");

    fireEvent.change(screen.getByTestId("batch-add-recipe"), { target: { value: "slot:0" } });
    expect(screen.getByTestId("builder-color-button").getAttribute("aria-label")).toContain("Blue");

    fireEvent.click(screen.getByTestId("builder-color-button"));
    fireEvent.click(await screen.findByTestId("builder-color-White"));

    // Build the batch afresh: position 0 now starts on the color the owner moved there
    fireEvent.click(screen.getByTestId("builder-remove-0"));
    fireEvent.change(screen.getByTestId("batch-add-recipe"), { target: { value: "slot:0" } });
    const relabelled = screen.getByTestId("builder-color-button").getAttribute("aria-label");
    expect(relabelled).toContain("White");
  });

  it("falls back to an empty batch for a draft stored before inline snapshots", async () => {
    // A pre-snapshot draft referenced a source by id and carries no rows; the isValid guard rejects
    // it so the page starts empty rather than rendering a batch with nothing to weigh.
    setLocalStorage(STORAGE_KEYS.makeRecipeBatch, {
      date: "2026-07-18",
      items: [{ sourceId: "slot:0" }],
    });
    render(<MakeRecipeView />);

    expect(await screen.findByTestId("checklist-empty")).toBeInTheDocument();
  });
});

describe("MakeRecipeView — saving a batch", () => {
  beforeEach(() => {
    setLocalStorage(STORAGE_KEYS.recipeStores, [
      { name: "My Gelato", serializedRows: "Whole Milk\t500" },
    ]);
  });

  it("disables save with a sign-in prompt while signed out", async () => {
    render(<MakeRecipeView />);
    await screen.findByTestId("batch-builder");
    fireEvent.change(screen.getByTestId("batch-add-recipe"), { target: { value: "slot:0" } });

    const save = screen.getByTestId("save-batch-button");
    expect(save).toBeDisabled();
    expect(save).toHaveAttribute("title", expect.stringContaining("Sign in"));
  });

  it("creates the batch on the first save and updates it on the next", async () => {
    setSessionEmail("owner@example.com");
    vi.mocked(createUserBatch).mockResolvedValue({
      id: 7,
      date: "2026-07-18",
      recipes: [],
      createdAt: "",
      updatedAt: "",
    });
    vi.mocked(updateUserBatch).mockResolvedValue(undefined);

    render(<MakeRecipeView />);
    await screen.findByTestId("batch-builder");
    fireEvent.change(screen.getByTestId("batch-add-recipe"), { target: { value: "slot:0" } });

    fireEvent.click(screen.getByTestId("save-batch-button"));
    await waitFor(() => expect(createUserBatch).toHaveBeenCalledTimes(1));
    expect(createUserBatch).toHaveBeenCalledWith("owner@example.com", {
      date: expect.any(String),
      recipes: [{ name: "My Gelato", rows: [["Whole Milk", 500]], color: "Blue" }],
    });

    // The returned id is remembered, so the second save updates that row rather than creating anew.
    fireEvent.click(screen.getByTestId("save-batch-button"));
    await waitFor(() => expect(updateUserBatch).toHaveBeenCalledTimes(1));
    expect(updateUserBatch).toHaveBeenCalledWith("owner@example.com", 7, expect.anything());
    expect(createUserBatch).toHaveBeenCalledTimes(1);
  });

  it("confirms before New batch discards an unsaved draft, keeping it on dismiss", async () => {
    render(<MakeRecipeView />);
    await screen.findByTestId("batch-builder");
    fireEvent.change(screen.getByTestId("batch-add-recipe"), { target: { value: "slot:0" } });
    expect(screen.getByTestId("checklist-cell-0-Whole Milk")).toBeInTheDocument();

    // Dismissed: the unsaved draft survives.
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByTestId("new-batch-button"));
    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.getByTestId("checklist-cell-0-Whole Milk")).toBeInTheDocument();

    // Confirmed: the draft is cleared.
    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByTestId("new-batch-button"));
    expect(screen.getByTestId("checklist-empty")).toBeInTheDocument();
  });

  it("confirms before New batch even when only a title was entered, with no recipes", async () => {
    render(<MakeRecipeView />);
    await screen.findByTestId("batch-builder");
    fireEvent.change(screen.getByTestId("batch-title"), { target: { value: "Draft name" } });

    // Dismissed: the typed title survives, since it is unsaved work with nothing on the checklist.
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByTestId("new-batch-button"));
    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.getByTestId("batch-title")).toHaveValue("Draft name");
  });

  it("New batch clears the selection and unbinds, so the next save creates again", async () => {
    setSessionEmail("owner@example.com");
    vi.mocked(createUserBatch).mockResolvedValue({
      id: 7,
      date: "2026-07-18",
      recipes: [],
      createdAt: "",
      updatedAt: "",
    });

    render(<MakeRecipeView />);
    await screen.findByTestId("batch-builder");
    fireEvent.change(screen.getByTestId("batch-add-recipe"), { target: { value: "slot:0" } });

    fireEvent.click(screen.getByTestId("save-batch-button"));
    await waitFor(() =>
      expect(screen.getByTestId("batch-status-dot")).not.toHaveAttribute("aria-hidden"),
    );

    // The bound batch is not in the mocked cache, so New treats the draft as unsaved and confirms.
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByTestId("new-batch-button"));

    // The draft is empty again and no longer bound to the saved batch.
    expect(screen.getByTestId("checklist-empty")).toBeInTheDocument();
    expect(screen.getByTestId("batch-status-dot")).toHaveAttribute("aria-hidden", "true");

    // A fresh recipe now saves as a new batch, not an update of the old one.
    fireEvent.change(screen.getByTestId("batch-add-recipe"), { target: { value: "slot:0" } });
    fireEvent.click(screen.getByTestId("save-batch-button"));
    await waitFor(() => expect(createUserBatch).toHaveBeenCalledTimes(2));
    expect(updateUserBatch).not.toHaveBeenCalled();
  });

  it("Save as new forks the bound batch into a fresh copy and rebinds to it", async () => {
    setSessionEmail("owner@example.com");
    vi.mocked(createUserBatch)
      .mockResolvedValueOnce({
        id: 7,
        date: "2026-07-18",
        recipes: [],
        createdAt: "",
        updatedAt: "",
      })
      .mockResolvedValueOnce({
        id: 99,
        date: "2026-07-18",
        recipes: [],
        createdAt: "",
        updatedAt: "",
      });

    render(<MakeRecipeView />);
    await screen.findByTestId("batch-builder");
    fireEvent.change(screen.getByTestId("batch-add-recipe"), { target: { value: "slot:0" } });

    // First save binds to id 7; only then does the "Save as new" control appear.
    expect(screen.queryByTestId("save-batch-as-new-button")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("save-batch-button"));
    await waitFor(() => expect(screen.getByTestId("save-batch-as-new-button")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("save-batch-as-new-button"));
    await waitFor(() => expect(createUserBatch).toHaveBeenCalledTimes(2));
    expect(updateUserBatch).not.toHaveBeenCalled();

    // Rebound to the new copy (id 99): the primary button now updates that one.
    fireEvent.click(screen.getByTestId("save-batch-button"));
    await waitFor(() =>
      expect(updateUserBatch).toHaveBeenCalledWith("owner@example.com", 99, expect.anything()),
    );
  });
});

describe("MakeRecipeView — loading a saved batch", () => {
  const SAVED: SavedBatchJson = {
    id: 7,
    title: "Loaded batch",
    date: "2026-07-01",
    recipes: [{ name: "Loaded", rows: [["Whole Milk", 500]], color: "Blue" }],
    createdAt: "",
    updatedAt: "",
  };

  /** Render signed-in with SAVED available, then load it into the editor via the list. */
  async function renderAndLoad() {
    setSessionEmail("owner@example.com");
    setSavedBatches([SAVED]);
    render(<MakeRecipeView />);
    await screen.findByTestId("batch-editor");
    fireEvent.click(screen.getByTestId("batch-open-7"));
    // Loaded and in sync with the saved batch: the status dot reads "Saved".
    await waitFor(() =>
      expect(screen.getByTestId("batch-status-dot")).toHaveAttribute("aria-label", "Saved"),
    );
  }

  it("loads a batch picked from the list into the editor, in place", async () => {
    setSessionEmail("owner@example.com");
    setSavedBatches([SAVED]);

    render(<MakeRecipeView />);
    await screen.findByTestId("batch-editor");

    // Nothing is bound until a batch is picked: the status dot is a hidden placeholder.
    expect(screen.getByTestId("batch-status-dot")).toHaveAttribute("aria-hidden", "true");

    fireEvent.click(screen.getByTestId("batch-open-7"));

    // The editor now shows the loaded batch, bound for update-in-place, and its row is highlighted.
    await waitFor(() =>
      expect(screen.getByTestId("batch-status-dot")).toHaveAttribute("aria-label", "Saved"),
    );
    expect(screen.getByTestId("checklist-cell-0-Whole Milk")).toHaveTextContent(/^500$/);
    expect(screen.getByTestId("batch-list-item-7")).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("heading", { name: "Loaded batch" })).toBeInTheDocument();
  });

  it("shows a recipe's opted-in version label, in the list and once loaded", async () => {
    const versioned: SavedBatchJson = {
      id: 9,
      title: "Versioned batch",
      date: "2026-07-01",
      recipes: [
        {
          name: "Vanilla",
          rows: [["Whole Milk", 500]],
          version: { ref: { recipeId: 5, versionNumber: 2 }, name: "2.1", hasSiblings: true },
        },
      ],
      createdAt: "",
      updatedAt: "",
    };
    setSessionEmail("owner@example.com");
    setSavedBatches([versioned]);

    render(<MakeRecipeView />);
    await screen.findByTestId("batch-editor");

    // The label is already resolved in the list preview, from the persisted snapshot...
    expect(
      within(screen.getByTestId("batch-list-item-9")).getByTestId("version-badge-v2.1"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("batch-open-9"));

    // ...and stays resolved once loaded into the editor, rather than reverting to the raw number.
    await waitFor(() =>
      expect(
        within(screen.getByTestId("batch-editor")).getByTestId("version-badge-v2.1"),
      ).toBeInTheDocument(),
    );
  });

  it("keeps showing the version label once its source has since been deleted", async () => {
    // No `ref`: this simulates the FK's `set null` after the source version is gone. Only the
    // snapshotted `name` is left, and it should still resolve to a badge.
    const versioned: SavedBatchJson = {
      id: 9,
      title: "Versioned batch",
      date: "2026-07-01",
      recipes: [{ name: "Vanilla", rows: [["Whole Milk", 500]], version: { name: "2.1" } }],
      createdAt: "",
      updatedAt: "",
    };
    setSessionEmail("owner@example.com");
    setSavedBatches([versioned]);

    render(<MakeRecipeView />);
    await screen.findByTestId("batch-editor");

    expect(
      within(screen.getByTestId("batch-list-item-9")).getByTestId("version-badge-v2.1"),
    ).toBeInTheDocument();
  });

  it("tints the Save control amber once a loaded batch has unsaved edits", async () => {
    await renderAndLoad();

    // Freshly loaded and unchanged: the Save control is not flagged dirty.
    const save = screen.getByTestId("save-batch-button");
    expect(save.querySelector(".text-amber-500")).toBeNull();

    fireEvent.change(screen.getByTestId("batch-title"), {
      target: { value: "Loaded batch (edited)" },
    });
    expect(save.querySelector(".text-amber-500")).not.toBeNull();
  });

  it("resets without a prompt when a loaded batch is left unchanged", async () => {
    await renderAndLoad();

    // Unchanged from the saved batch, so nothing is lost: no prompt, and the draft resets.
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByTestId("new-batch-button"));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("checklist-empty")).toBeInTheDocument();
  });

  it("confirms before New batch when a loaded batch has unsaved edits", async () => {
    await renderAndLoad();

    // Edit the title so the draft diverges from the saved batch.
    fireEvent.change(screen.getByTestId("batch-title"), {
      target: { value: "Loaded batch (edited)" },
    });

    // Dismissed: the edited draft survives.
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByTestId("new-batch-button"));
    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.getByTestId("checklist-cell-0-Whole Milk")).toBeInTheDocument();
  });

  it("offers delete only once a batch is loaded", async () => {
    setSessionEmail("owner@example.com");
    setSavedBatches([SAVED]);
    render(<MakeRecipeView />);
    await screen.findByTestId("batch-editor");

    // Nothing is bound yet, so there is no batch to delete.
    expect(screen.queryByTestId("delete-batch-button")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("batch-open-7"));
    await waitFor(() => expect(screen.getByTestId("delete-batch-button")).toBeInTheDocument());
  });

  it("deletes the loaded batch after confirming, then unbinds the draft", async () => {
    await renderAndLoad();

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByTestId("delete-batch-button"));

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("Loaded batch"));
    await waitFor(() => expect(deleteUserBatch).toHaveBeenCalledWith("owner@example.com", 7));

    // Unbound after delete: the status dot returns to its hidden placeholder.
    await waitFor(() =>
      expect(screen.getByTestId("batch-status-dot")).toHaveAttribute("aria-hidden", "true"),
    );
  });

  it("does not delete when the confirm is dismissed", async () => {
    await renderAndLoad();

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByTestId("delete-batch-button"));

    expect(confirmSpy).toHaveBeenCalled();
    expect(deleteUserBatch).not.toHaveBeenCalled();
  });
});

describe("MakeRecipeView — adding a saved recipe", () => {
  /** Accessible name of the version select on the first builder row. */
  const VERSION_SELECT = "Recipe A version";

  /** A saved recipe whose versions differ in amount, so a version switch shows on the row. */
  function savedRecipe(id: number, name: string, versionNumbers: number[]): SavedRecipeJson {
    const versions: SavedRecipeJson["versions"] = versionNumbers.map((v) => ({
      version: v,
      recipe: [["Whole Milk", 100 * v]],
      createdAt: "2026-07-18T00:00:00.000Z",
    }));
    return { id, name, versions };
  }

  beforeEach(() => {
    setSessionEmail("owner@example.com");
    setSavedBatches(
      [],
      [savedRecipe(1, "My Gelato", [1, 2, 3]), savedRecipe(2, "Lone Sorbet", [1])],
    );
  });

  /** Render, then add the recipe behind `sourceId` to the batch. */
  async function renderAndAdd(sourceId: string) {
    render(<MakeRecipeView />);
    await screen.findByTestId("batch-builder");
    fireEvent.change(screen.getByTestId("batch-add-recipe"), { target: { value: sourceId } });
  }

  it("offers one line per recipe, qualified by its version count", async () => {
    render(<MakeRecipeView />);
    await screen.findByTestId("batch-builder");

    const options = within(screen.getByTestId("batch-add-recipe")).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "Add a recipe…",
      "My Gelato (3 versions)",
      "Lone Sorbet",
    ]);
  });

  it("weighs the latest version when a recipe is added", async () => {
    await renderAndAdd("recipe:1");

    expect(screen.getByTestId("checklist-cell-0-Whole Milk")).toHaveTextContent(/^300$/);
    expect(getSelectedOptionLabelByLabel(VERSION_SELECT)).toContain("v3");
  });

  it("offers the recipe's other versions on the row, newest first and latest marked", async () => {
    await renderAndAdd("recipe:1");

    expect(await getSelectOptionLabelsByLabel(VERSION_SELECT)).toEqual(["v3 · latest", "v2", "v1"]);
  });

  it("labels a version by its opted-in name rather than its number", async () => {
    setSavedBatches(
      [],
      [
        {
          id: 3,
          name: "Named Gelato",
          versions: [
            { version: 1, recipe: [["Whole Milk", 100]], createdAt: "2026-07-18T00:00:00.000Z" },
            {
              version: 2,
              recipe: [["Whole Milk", 200]],
              versionName: "2.1",
              createdAt: "2026-07-18T00:00:00.000Z",
            },
          ],
        },
      ],
    );
    await renderAndAdd("recipe:3");

    expect(getSelectedOptionLabelByLabel(VERSION_SELECT)).toContain("v2.1");
    expect(await getSelectOptionLabelsByLabel(VERSION_SELECT)).toEqual(["v2.1 · latest", "v1"]);
  });

  it("re-snapshots the row from the version picked, amounts and all", async () => {
    await renderAndAdd("recipe:1");

    await selectOptionByLabel(VERSION_SELECT, /^v2$/);

    expect(screen.getByTestId("checklist-cell-0-Whole Milk")).toHaveTextContent(/^200$/);
    expect(getSelectedOptionLabelByLabel(VERSION_SELECT)).toContain("v2");
    expect(getLocalStorage(STORAGE_KEYS.makeRecipeBatch)).toMatchObject({
      items: [
        {
          color: CategoryColor.Blue,
          recipe: {
            name: "My Gelato",
            rows: [["Whole Milk", 200]],
            version: { ref: { recipeId: 1, versionNumber: 2 } },
          },
        },
      ],
    });
  });

  it("keeps the row's container color across a version change", async () => {
    await renderAndAdd("recipe:1");

    fireEvent.click(screen.getByTestId("builder-color-button"));
    fireEvent.click(await screen.findByTestId("builder-color-White"));

    await selectOptionByLabel(VERSION_SELECT, /^v1$/);

    expect(screen.getByTestId("builder-color-button").getAttribute("aria-label")).toContain(
      "White",
    );
  });

  it("offers no version picker for a recipe holding a single version", async () => {
    await renderAndAdd("recipe:2");

    expect(screen.queryByRole("combobox", { name: VERSION_SELECT })).not.toBeInTheDocument();
    expect(screen.getByTestId("checklist-cell-0-Whole Milk")).toHaveTextContent(/^100$/);
  });
});

describe("MakeRecipeView — batch quality signals", () => {
  const PLAIN: SavedBatchJson = {
    id: 1,
    title: "Plain batch",
    date: "2026-07-01",
    recipes: [{ name: "Loaded", rows: [["Whole Milk", 500]] }],
    createdAt: "",
    updatedAt: "",
  };

  const STARRED: SavedBatchJson = { ...PLAIN, id: 2, title: "Starred batch", favourite: true };

  /** Render signed-in with both batches listed. */
  async function renderBoth() {
    setSessionEmail("owner@example.com");
    setSavedBatches([PLAIN, STARRED]);
    render(<MakeRecipeView />);
    await screen.findByTestId("batch-editor");
  }

  it("lists both batches while the favourites filter is off", async () => {
    await renderBoth();

    expect(screen.getByTestId("batch-open-1")).toBeInTheDocument();
    expect(screen.getByTestId("batch-open-2")).toBeInTheDocument();
  });

  it("narrows to the starred batch when the filter is switched on", async () => {
    await renderBoth();

    fireEvent.click(screen.getByTestId("favourites-filter"));

    expect(screen.queryByTestId("batch-open-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("batch-open-2")).toBeInTheDocument();
  });

  it("explains an empty list caused by the filter rather than by the search", async () => {
    setSessionEmail("owner@example.com");
    setSavedBatches([PLAIN]);
    render(<MakeRecipeView />);
    await screen.findByTestId("batch-editor");

    fireEvent.click(screen.getByTestId("favourites-filter"));

    expect(screen.getByTestId("batch-list-empty")).toHaveTextContent(
      "No favourite batches. Star one to find it here.",
    );
  });

  it("offers no star until a saved batch is loaded into the editor", async () => {
    await renderBoth();

    expect(screen.queryByTestId("favourite-toggle")).not.toBeInTheDocument();
  });

  it("shows the loaded batch's star state", async () => {
    await renderBoth();

    fireEvent.click(screen.getByTestId("batch-open-2"));

    await waitFor(() =>
      expect(screen.getByTestId("favourite-toggle")).toHaveAttribute("aria-pressed", "true"),
    );
  });

  it("stars the loaded batch through its own action, never through a save", async () => {
    await renderBoth();

    fireEvent.click(screen.getByTestId("batch-open-1"));
    await waitFor(() => expect(screen.getByTestId("favourite-toggle")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("favourite-toggle"));

    await waitFor(() =>
      expect(setUserBatchFavourite).toHaveBeenCalledWith("owner@example.com", 1, true),
    );
    expect(updateUserBatch).not.toHaveBeenCalled();
    expect(createUserBatch).not.toHaveBeenCalled();
  });

  it("clears the star on an already-starred batch", async () => {
    await renderBoth();

    fireEvent.click(screen.getByTestId("batch-open-2"));
    await waitFor(() => expect(screen.getByTestId("favourite-toggle")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("favourite-toggle"));

    await waitFor(() =>
      expect(setUserBatchFavourite).toHaveBeenCalledWith("owner@example.com", 2, false),
    );
  });
});
