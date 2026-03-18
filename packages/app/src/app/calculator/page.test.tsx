import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";

import CalculatorPage from "./page";

import { TEST_USER_A } from "@/lib/database/util";

// ---------------------------------------------------------------------------
// Test helpers, mocks, and setup
// ---------------------------------------------------------------------------

/** Mock implementation of ResizeObserver for testing purposes */
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

const matchMediaMock = vi
  .fn()
  .mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

vi.stubGlobal("ResizeObserver", ResizeObserverMock);
vi.stubGlobal("matchMedia", matchMediaMock);

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

vi.mock("@/lib/data", () => ({
  fetchUserIngredientSpecByName: vi.fn(() => Promise.resolve(undefined)),
  fetchAllUserIngredientSpecs: vi.fn(() => Promise.resolve([])),
}));

vi.mock("next-auth/react", () => ({
  useSession: vi.fn().mockReturnValue({ data: null, status: "unauthenticated" }),
}));

vi.mock("@/app/navbar", () => ({ useNavbarContext: () => ({ theme: "Light" }) }));

// ---------------------------------------------------------------------------
// Calculator Page
// ---------------------------------------------------------------------------

describe("Calculator Page", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    setupVitestCanvasMock();

    const { useSession } = await import("next-auth/react");
    vi.mocked(useSession).mockReturnValue({
      update: vi.fn(),
      data: null,
      status: "unauthenticated",
    });
  });

  afterEach(async () => {
    cleanup();
    await vi.waitFor(() => {}, { timeout: 100 });
  });

  it("should render one RecipeGrid component", () => {
    const { container } = render(<CalculatorPage />);
    expect(container.querySelectorAll("#recipe-grid").length).toBe(1);
  });

  it("should render one MixPropertiesGrid component", () => {
    const { container } = render(<CalculatorPage />);
    expect(container.querySelectorAll("#mix-properties-grid").length).toBe(1);
  });

  it("should render one IngredientCompositionGrid component", () => {
    const { container } = render(<CalculatorPage />);
    expect(container.querySelectorAll("#ing-composition-grid").length).toBe(1);
  });

  it("should pre-seed WasmBridge with all embedded ingredient specs on mount", async () => {
    const { new_ingredient_database_seeded_from_embedded_data } =
      await import("@workspace/sci-cream");

    render(<CalculatorPage />);

    await waitFor(() => {
      expect(new_ingredient_database_seeded_from_embedded_data).toHaveBeenCalled();
    });
  });

  it("if logged in, should pre-fetch all user ingredient specs on mount", async () => {
    const { useSession } = await import("next-auth/react");
    vi.mocked(useSession).mockReturnValue({
      data: { user: { email: TEST_USER_A.email }, expires: "" },
      status: "authenticated",
      update: vi.fn(),
    });

    const { fetchAllUserIngredientSpecs } = await import("@/lib/data");
    render(<CalculatorPage />);

    await waitFor(() => {
      expect(fetchAllUserIngredientSpecs).toHaveBeenCalledWith(TEST_USER_A.email);
    });
  });

  it("if not logged in, should not pre-fetch any user ingredient specs on mount", async () => {
    const { fetchAllUserIngredientSpecs } = await import("@/lib/data");
    render(<CalculatorPage />);

    await waitFor(() => {
      expect(fetchAllUserIngredientSpecs).not.toHaveBeenCalled();
    });
  });

  it("should initialize recipes with empty ingredient rows", () => {
    const { container } = render(<CalculatorPage />);
    expect(container.querySelectorAll("input").length).toBeGreaterThan(0);
  });
});
