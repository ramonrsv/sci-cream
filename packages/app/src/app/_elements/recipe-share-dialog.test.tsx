import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

import type { LightRecipe } from "@workspace/sci-cream";

import { ShareRecipeAction } from "./recipe-share-dialog";
import { useSessionResources, type SessionResources } from "@/lib/session-resources";
import { USER_DEFINED_FRUCTOSE_SPEC } from "@/lib/database/assets";
import { decodeSharePayload, type SharePayload } from "@/lib/recipe-share";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/session-resources", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-resources")>();
  return { ...actual, useSessionResources: vi.fn() };
});

// ---------------------------------------------------------------------------
// Fixtures and helpers
// ---------------------------------------------------------------------------

const ROWS: LightRecipe = [
  ["Whole Milk", 500],
  ["Sucrose", 100],
];

const USER_SPEC_NAME = USER_DEFINED_FRUCTOSE_SPEC.name;

/** Rows that include one of the (mocked) user's own ingredient specs. */
const ROWS_WITH_USER_SPEC: LightRecipe = [...ROWS, [USER_SPEC_NAME, 25]];

/** Mock the session's user-defined ingredient specs visible to the dialog. */
function mockUserSpecs(specs: { name: string; spec: unknown }[]) {
  vi.mocked(useSessionResources).mockReturnValue({
    userIngredientSpecs: specs,
  } as unknown as SessionResources);
}

/** Open the dialog and wait for the share link field to be populated. */
async function openDialog(): Promise<HTMLInputElement> {
  fireEvent.click(screen.getByTestId("share-recipe-button"));
  const input = (await screen.findByTestId("share-link")) as HTMLInputElement;
  await waitFor(() => expect(input.value).toMatch(/\/share#.+/));
  return input;
}

/** Decode the payload out of the share-link input's current URL value. */
async function decodeLink(input: HTMLInputElement): Promise<SharePayload> {
  return decodeSharePayload(input.value.split("#")[1]);
}

describe("ShareRecipeAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserSpecs([]);
  });

  afterEach(async () => {
    cleanup();
    await vi.waitFor(() => {}, { timeout: 100 });
  });

  it("disables the button when there are no rows to share", () => {
    render(<ShareRecipeAction name="Empty" rows={[]} />);
    const button = screen.getByTestId("share-recipe-button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("title", "Add ingredients to share");
  });

  it("produces a link and an iframe snippet that encode the recipe", async () => {
    render(<ShareRecipeAction name="Base" rows={ROWS} evaporation={25} />);
    const link = await openDialog();

    await expect(decodeLink(link)).resolves.toEqual({ v: 1, n: "Base", r: ROWS, e: 25 });
    const embed = (await screen.findByTestId("share-embed")) as HTMLInputElement;
    expect(embed.value).toMatch(/^<iframe src=".*\/share\/embed#.+" width=/);
  });

  describe("user-defined spec consent", () => {
    it("shows no consent list when the recipe uses no user-defined ingredients", async () => {
      mockUserSpecs([{ name: USER_SPEC_NAME, spec: USER_DEFINED_FRUCTOSE_SPEC }]);
      render(<ShareRecipeAction name="Base" rows={ROWS} />);
      await openDialog();
      expect(screen.queryByTestId("share-spec-consent")).not.toBeInTheDocument();
    });

    it("defaults to unchecked and omits the spec from the payload", async () => {
      mockUserSpecs([{ name: USER_SPEC_NAME, spec: USER_DEFINED_FRUCTOSE_SPEC }]);
      render(<ShareRecipeAction name="Base" rows={ROWS_WITH_USER_SPEC} />);
      const link = await openDialog();

      expect(screen.getByRole("checkbox", { name: USER_SPEC_NAME })).not.toBeChecked();
      await expect(decodeLink(link)).resolves.not.toHaveProperty("s");
    });

    it("inlines the spec after the checkbox is checked", async () => {
      mockUserSpecs([{ name: USER_SPEC_NAME, spec: USER_DEFINED_FRUCTOSE_SPEC }]);
      render(<ShareRecipeAction name="Base" rows={ROWS_WITH_USER_SPEC} />);
      const link = await openDialog();
      const before = link.value;

      fireEvent.click(screen.getByRole("checkbox", { name: USER_SPEC_NAME }));
      await waitFor(() => expect(link.value).not.toBe(before));

      await expect(decodeLink(link)).resolves.toMatchObject({ s: [USER_DEFINED_FRUCTOSE_SPEC] });
    });

    it("resets consent to none when the dialog is closed and reopened", async () => {
      mockUserSpecs([{ name: USER_SPEC_NAME, spec: USER_DEFINED_FRUCTOSE_SPEC }]);
      render(<ShareRecipeAction name="Base" rows={ROWS_WITH_USER_SPEC} />);
      await openDialog();
      fireEvent.click(screen.getByRole("checkbox", { name: USER_SPEC_NAME }));
      expect(screen.getByRole("checkbox", { name: USER_SPEC_NAME })).toBeChecked();

      fireEvent.click(screen.getByTestId("share-recipe-button")); // close (unmounts the panel)
      await openDialog();
      expect(screen.getByRole("checkbox", { name: USER_SPEC_NAME })).not.toBeChecked();
    });
  });

  describe("include-comments checkbox", () => {
    it("is absent when the recipe has no comments", async () => {
      render(<ShareRecipeAction name="Base" rows={ROWS} />);
      await openDialog();
      expect(screen.queryByTestId("share-include-comments")).not.toBeInTheDocument();
    });

    it("defaults to checked and includes the comments in the payload", async () => {
      render(<ShareRecipeAction name="Base" rows={ROWS} comments="Ripen overnight." />);
      const link = await openDialog();

      expect(screen.getByTestId("share-include-comments")).toBeChecked();
      await expect(decodeLink(link)).resolves.toMatchObject({ c: "Ripen overnight." });
    });

    it("omits the comments after the checkbox is unchecked", async () => {
      render(<ShareRecipeAction name="Base" rows={ROWS} comments="Ripen overnight." />);
      const link = await openDialog();
      const before = link.value;

      fireEvent.click(screen.getByTestId("share-include-comments"));
      await waitFor(() => expect(link.value).not.toBe(before));

      await expect(decodeLink(link)).resolves.not.toHaveProperty("c");
    });
  });
});
