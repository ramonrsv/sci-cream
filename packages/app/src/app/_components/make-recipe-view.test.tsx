import "@testing-library/jest-dom/vitest";

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

import { MakeRecipeView } from "./make-recipe-view";
import { type Batch, batchChecklistKey, cellKey } from "@/lib/batch/batch";
import {
  MAX_BATCH_ENCODED_CHARS,
  BATCH_PAYLOAD_VERSION,
  encodeBatchPayload,
  makeBatchPayload,
  type BatchPayload,
} from "@/lib/batch/batch-share";
import { STORAGE_KEYS, getLocalStorage, setLocalStorage } from "@/lib/local-storage";
import { CategoryColor } from "@/lib/styles/colors";

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
});

afterEach(cleanup);

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
  it("writes a concrete color into the selection as a recipe is added", async () => {
    setLocalStorage(STORAGE_KEYS.recipeStores, [
      { name: "My Gelato", serializedRows: "Whole Milk\t500" },
    ]);
    render(<MakeRecipeView />);
    await screen.findByTestId("batch-builder");

    fireEvent.change(screen.getByTestId("batch-add-recipe"), { target: { value: "slot:0" } });

    expect(getLocalStorage(STORAGE_KEYS.makeRecipeBatch)).toMatchObject({
      items: [{ sourceId: "slot:0", color: CategoryColor.Blue }],
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

  it("drops a selected slot that no longer exists rather than failing", async () => {
    setLocalStorage(STORAGE_KEYS.makeRecipeBatch, {
      date: "2026-07-18",
      items: [{ sourceId: "slot:0" }],
    });
    render(<MakeRecipeView />);

    expect(await screen.findByTestId("checklist-empty")).toBeInTheDocument();
  });
});
