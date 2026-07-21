import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

import { ShareBatchAction } from "./batch-share-dialog";
import type { Batch } from "@/lib/batch/batch";
import { BATCH_URL_WARN_CHARS, encodeBatchPayload } from "@/lib/batch/batch-share";

// The payload size is what the budget caps, so the tests drive it directly rather than trying to
// coax the real encoder onto a boundary that depends on how well a batch happens to compress.
vi.mock("@/lib/batch/batch-share", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/batch/batch-share")>();
  return { ...actual, encodeBatchPayload: vi.fn() };
});

const BATCH: Batch = {
  date: "2026-07-18",
  recipes: [{ name: "Base", rows: [["Whole Milk", 500]] }],
};

/** Render with an encoded payload of exactly `length` characters, and open the dialog. */
async function openDialogWithPayload(length: number): Promise<HTMLInputElement> {
  vi.mocked(encodeBatchPayload).mockResolvedValue("A".repeat(length));
  render(<ShareBatchAction batch={BATCH} />);
  fireEvent.click(screen.getByTestId("share-batch-button"));
  const input = (await screen.findByTestId("batch-share-link")) as HTMLInputElement;
  await waitFor(() => expect(input.value).toMatch(/\/make-recipe#A+/));
  return input;
}

describe("ShareBatchAction length warning", () => {
  afterEach(cleanup);

  it("stays quiet at the budget, which caps the payload rather than the whole link", async () => {
    const input = await openDialogWithPayload(BATCH_URL_WARN_CHARS);

    // The origin and route push the link itself past the number the payload just meets
    expect(input.value.length).toBeGreaterThan(BATCH_URL_WARN_CHARS);
    expect(screen.queryByTestId("batch-share-length-warning")).not.toBeInTheDocument();
  });

  it("warns once the payload passes the budget, reporting the link's own length", async () => {
    const input = await openDialogWithPayload(BATCH_URL_WARN_CHARS + 1);

    const warning = screen.getByTestId("batch-share-length-warning");
    expect(warning).toHaveTextContent(`${String(input.value.length)} characters`);
  });
});
