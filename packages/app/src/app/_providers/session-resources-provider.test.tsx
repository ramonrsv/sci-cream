import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";

import { useSession } from "next-auth/react";
import {
  fetchAllUserSavedRecipes,
  fetchAllUserIngredientSpecs,
  type SavedRecipeJson,
} from "@/lib/data";

import { SessionResourcesProvider } from "./session-resources-provider";
import { useSessionResources } from "@/lib/resources/session-resources";

// ---------------------------------------------------------------------------
// Mocks — the real WASM module is used so the provider builds a genuine bridge.
// ---------------------------------------------------------------------------

vi.mock("next-auth/react", () => ({ useSession: vi.fn() }));
vi.mock("@/lib/data", () => ({
  fetchAllUserSavedRecipes: vi.fn().mockResolvedValue([]),
  fetchAllUserIngredientSpecs: vi.fn().mockResolvedValue([]),
}));

// Spy on the embedded-data seeder (wrapping the real one) so we can assert the provider seeds the
// shared bridge specifically from embedded data — not via some other seeding path.
vi.mock("@workspace/sci-cream", async () => {
  const actual =
    await vi.importActual<typeof import("@workspace/sci-cream")>("@workspace/sci-cream");
  return {
    ...actual,
    new_ingredient_database_seeded_from_embedded_data: vi.fn(() =>
      actual.new_ingredient_database_seeded_from_embedded_data(),
    ),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Mock a signed-in session for the next render. */
function mockSignedIn(email = "a@b.c") {
  vi.mocked(useSession).mockReturnValue({
    data: { user: { email }, expires: "" },
    status: "authenticated",
    update: vi.fn(),
  });
}

/** Mock a signed-out session for the next render. */
function mockSignedOut() {
  vi.mocked(useSession).mockReturnValue({ data: null, status: "unauthenticated", update: vi.fn() });
}

/** Test consumer that surfaces the shared saved-recipes count and a refresh trigger. */
function Consumer() {
  const { savedRecipes, refreshUserRecipes } = useSessionResources();
  return (
    <button type="button" onClick={() => void refreshUserRecipes()}>
      recipes:{savedRecipes.length}
    </button>
  );
}

/** Render the provider wrapping the test consumer. */
function renderProvider() {
  return render(
    <SessionResourcesProvider>
      <Consumer />
    </SessionResourcesProvider>,
  );
}

const savedRecipe: SavedRecipeJson = {
  id: 42,
  name: "Standard Base",
  versions: [{ version: 1, recipe: [["Whole Milk", 100]], createdAt: "" }],
};

// ---------------------------------------------------------------------------
// SessionResourcesProvider
// ---------------------------------------------------------------------------

describe("SessionResourcesProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchAllUserSavedRecipes).mockResolvedValue([]);
    vi.mocked(fetchAllUserIngredientSpecs).mockResolvedValue([]);
    mockSignedOut();
  });

  afterEach(cleanup);

  it("seeds the shared bridge from embedded data on mount", async () => {
    const { new_ingredient_database_seeded_from_embedded_data } =
      await import("@workspace/sci-cream");
    renderProvider();
    expect(new_ingredient_database_seeded_from_embedded_data).toHaveBeenCalled();
  });

  it("does not fetch user data when signed out", async () => {
    renderProvider();
    // Let any pending effects/microtasks flush before asserting nothing was fetched.
    await waitFor(() => expect(screen.getByRole("button")).toBeInTheDocument());
    expect(fetchAllUserSavedRecipes).not.toHaveBeenCalled();
    expect(fetchAllUserIngredientSpecs).not.toHaveBeenCalled();
  });

  it("fetches saved recipes and ingredient specs once on mount when signed in", async () => {
    mockSignedIn();
    renderProvider();

    await waitFor(() => {
      expect(fetchAllUserSavedRecipes).toHaveBeenCalledWith("a@b.c");
      expect(fetchAllUserIngredientSpecs).toHaveBeenCalledWith("a@b.c");
    });
  });

  it("refreshUserRecipes re-fetches into the shared saved-recipes cache", async () => {
    mockSignedIn();
    renderProvider();

    await waitFor(() => expect(screen.getByRole("button")).toHaveTextContent("recipes:0"));

    vi.mocked(fetchAllUserSavedRecipes).mockResolvedValue([savedRecipe]);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(screen.getByRole("button")).toHaveTextContent("recipes:1"));
  });
});
