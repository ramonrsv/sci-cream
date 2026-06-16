import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

import { makeEmptyRecipeContext, type RecipeContext, RecipeContextState } from "@/lib/recipe";
import { makeWasmResources, WasmResourcesState, WasmResources } from "@/lib/wasm-resources";
import { RecipeEditorPanel } from "./recipe-editor-panel";

import {
  Bridge as WasmBridge,
  new_ingredient_database_seeded_from_embedded_data,
} from "@workspace/sci-cream";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn().mockReturnValue({ data: null, status: "unauthenticated" }),
}));

vi.mock("@/lib/data", () => ({ upsertUserRecipe: vi.fn() }));

describe("RecipeEditorPanel", () => {
  let recipeContext: RecipeContext;
  let wasmResources: WasmResources;

  beforeEach(() => {
    vi.clearAllMocks();
    setupVitestCanvasMock();

    recipeContext = makeEmptyRecipeContext();
    wasmResources = makeWasmResources(
      new WasmBridge(new_ingredient_database_seeded_from_embedded_data()),
    );
  });

  afterEach(async () => {
    cleanup();
    await vi.waitFor(() => {}, { timeout: 100 });
  });

  const makePanelProps = () => ({
    recipeCtxState: [recipeContext, vi.fn()] as RecipeContextState,
    wasmResourcesState: [wasmResources, vi.fn()] as WasmResourcesState,
  });

  describe("Panel Chrome", () => {
    it("should render with the correct id", () => {
      const { container } = render(<RecipeEditorPanel props={makePanelProps()} />);
      expect(container.querySelector("#recipe-editor-panel")).toBeInTheDocument();
    });

    it("should render with the grid-component class", () => {
      const { container } = render(<RecipeEditorPanel props={makePanelProps()} />);
      expect(container.querySelector(".grid-component")).toBeInTheDocument();
    });

    it("should render a drag handle", () => {
      const { container } = render(<RecipeEditorPanel props={makePanelProps()} />);
      expect(container.querySelector(".drag-handle")).toBeInTheDocument();
    });
  });
});
