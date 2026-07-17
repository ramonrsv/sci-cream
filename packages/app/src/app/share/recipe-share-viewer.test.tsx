import "@testing-library/jest-dom/vitest";

import { StrictMode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

import type { LightRecipe } from "@workspace/sci-cream";

import { ShareViewer } from "./recipe-share-viewer";
import { USER_DEFINED_FRUCTOSE_SPEC } from "@/lib/database/assets";
import { STORAGE_KEYS } from "@/lib/local-storage";
import {
  MAX_ENCODED_CHARS,
  SHARE_PAYLOAD_VERSION,
  encodeSharePayload,
  makeSharePayload,
  type SharePayload,
} from "@/lib/recipe-share";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const routerPush = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: routerPush }) }));

// ---------------------------------------------------------------------------
// Fixtures and helpers
// ---------------------------------------------------------------------------

const ROWS: LightRecipe = [
  ["Whole Milk", 500],
  ["Sucrose", 100],
];

/** Set the URL fragment and render the viewer; decoding is async, so callers must `find*`. */
async function renderWithHash(encoded: string, ui = <ShareViewer />) {
  window.location.hash = `#${encoded}`;
  return render(ui);
}

/** Point the already-rendered viewer at a new payload by changing the fragment. */
async function changeHash(encoded: string) {
  await act(async () => {
    window.location.hash = `#${encoded}`;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}

describe("ShareViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.location.hash = "";
  });

  afterEach(async () => {
    cleanup();
    await vi.waitFor(() => {}, { timeout: 100 });
  });

  describe("ready state", () => {
    it("renders the recipe name, rows, and mix properties for a valid link", async () => {
      await renderWithHash(await encodeSharePayload(makeSharePayload("Shared Base", ROWS)));

      expect(await screen.findByRole("heading", { name: "Shared Base" })).toBeVisible();
      expect(screen.getByRole("cell", { name: "Whole Milk" })).toBeVisible();
      expect(screen.getByRole("cell", { name: "Sucrose" })).toBeVisible();
      expect(screen.getByTestId("properties-table-pane")).toBeInTheDocument();
      expect(screen.queryByTestId("share-unresolved-warning")).not.toBeInTheDocument();
      expect(screen.queryByTestId("share-error")).not.toBeInTheDocument();
    });

    it("renders shared comments read-only beneath the body", async () => {
      const payload = makeSharePayload("With Notes", ROWS, undefined, "Ripen overnight.");
      await renderWithHash(await encodeSharePayload(payload));

      expect(await screen.findByText("Ripen overnight.")).toBeVisible();
    });

    it("resolves rows against a valid inlined user-defined spec", async () => {
      const rows: LightRecipe = [...ROWS, [USER_DEFINED_FRUCTOSE_SPEC.name, 25]];
      const payload = makeSharePayload("With Spec", rows, undefined, undefined, [
        USER_DEFINED_FRUCTOSE_SPEC,
      ]);
      await renderWithHash(await encodeSharePayload(payload));

      await screen.findByRole("heading", { name: "With Spec" });
      expect(screen.queryByTestId("share-unresolved-warning")).not.toBeInTheDocument();
      expect(screen.getByTestId("properties-table-pane")).toBeInTheDocument();
    });

    it("re-decodes when the fragment changes without a remount", async () => {
      await renderWithHash(await encodeSharePayload(makeSharePayload("First", ROWS)));
      await screen.findByRole("heading", { name: "First" });

      await changeHash(await encodeSharePayload(makeSharePayload("Second", ROWS)));
      expect(await screen.findByRole("heading", { name: "Second" })).toBeVisible();
    });
  });

  describe("unresolved rows", () => {
    const rows: LightRecipe = [
      ["Whole Milk", 500],
      ["Not A Real Ingredient", 25],
    ];

    it("warns, flags the row, and still shows properties from the rows that resolve", async () => {
      await renderWithHash(await encodeSharePayload(makeSharePayload("Partly Unknown", rows)));

      expect(await screen.findByTestId("share-unresolved-warning")).toBeVisible();
      expect(screen.getByTestId("properties-table-pane")).toBeInTheDocument();
      expect(screen.getByRole("cell", { name: "Not A Real Ingredient" })).toHaveClass(
        /outline-red-400/,
      );
    });
  });

  describe("mixError degradation", () => {
    it("flags the evaporation readout red instead of failing the link", async () => {
      // Evaporation far exceeding the mix's water: the WASM calculation throws
      const payload = makeSharePayload("Evap Overflow", [["Sucrose", 100]], 500);
      await renderWithHash(await encodeSharePayload(payload));

      await screen.findByRole("heading", { name: "Evap Overflow" });
      const readout = screen.getByTitle(/Invalid evaporation/);
      expect(readout).toBeInTheDocument();
      expect(readout.querySelector(".text-red-500")).toHaveTextContent("500");
      expect(screen.getByTestId("properties-table-pane")).toBeInTheDocument();
      expect(screen.queryByTestId("share-error")).not.toBeInTheDocument();
    });
  });

  describe("error states", () => {
    it("shows the Invalid message for a corrupted fragment", async () => {
      await renderWithHash("not-a-valid-payload");
      expect(await screen.findByTestId("share-error")).toHaveTextContent(/invalid or corrupted/);
    });

    it("shows the UnknownVersion message for a newer payload version", async () => {
      const future = {
        ...makeSharePayload("Future", ROWS),
        v: SHARE_PAYLOAD_VERSION + 1,
      } as unknown as SharePayload;
      await renderWithHash(await encodeSharePayload(future));
      expect(await screen.findByTestId("share-error")).toHaveTextContent(/newer version/);
    });

    it("shows the TooLarge message for an over-long fragment", async () => {
      await renderWithHash("A".repeat(MAX_ENCODED_CHARS + 1));
      expect(await screen.findByTestId("share-error")).toHaveTextContent(/maximum supported size/);
    });

    it("shows the InvalidSpec message when an inlined spec fails to seed", async () => {
      const payload = makeSharePayload("Bad Spec", ROWS, undefined, undefined, [
        { NotASpecKind: { nonsense: true } },
      ]);
      await renderWithHash(await encodeSharePayload(payload));
      expect(await screen.findByTestId("share-error")).toHaveTextContent(/invalid ingredient spec/);
    });
  });

  describe("open in calculator", () => {
    it("writes the recipe store to the chosen slot and navigates", async () => {
      const payload = makeSharePayload("To Calculator", ROWS, 50);
      await renderWithHash(await encodeSharePayload(payload));

      fireEvent.click(await screen.findByRole("button", { name: "Open in calculator" }));

      expect(routerPush).toHaveBeenCalledWith("/calculator?slot=0");
      const stores = JSON.parse(localStorage.getItem(STORAGE_KEYS.recipeStores) ?? "[]");
      expect(stores[0]).toEqual({
        name: "To Calculator",
        serializedRows: "Whole Milk\t500\nSucrose\t100",
        evaporation: 50,
      });
    });
  });

  describe("embed variant", () => {
    it("replaces the calculator handoff with a full-view link", async () => {
      const encoded = await encodeSharePayload(makeSharePayload("Embedded", ROWS));
      await renderWithHash(encoded, <ShareViewer embed />);

      await screen.findByRole("heading", { name: "Embedded" });
      expect(screen.queryByRole("button", { name: "Open in calculator" })).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "View full recipe" })).toHaveAttribute(
        "href",
        `/share#${encoded}`,
      );
    });
  });

  describe("WASM lifetime (StrictMode)", () => {
    it("survives a StrictMode mount cycle and a payload replacement", async () => {
      await renderWithHash(
        await encodeSharePayload(makeSharePayload("First", ROWS)),
        <StrictMode>
          <ShareViewer />
        </StrictMode>,
      );
      await screen.findByRole("heading", { name: "First" });

      // Replacing the payload frees the previous bridge and MixProperties via useFreeOnReplace;
      // the re-render must read only live objects.
      await changeHash(await encodeSharePayload(makeSharePayload("Second", ROWS)));
      await screen.findByRole("heading", { name: "Second" });
      expect(screen.getByTestId("properties-table-pane")).toBeInTheDocument();
    });
  });
});
