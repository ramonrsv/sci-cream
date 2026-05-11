import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { render, screen, cleanup, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type SetStateAction, useState, useEffect } from "react";

import { RECIPE_TOTAL_ROWS } from "../../lib/styles/sizes";
import {
  makeEmptyRecipeContext,
  makeRecipeResources,
  type RecipeContext,
  type RecipeResources,
  RecipeContextState,
  RecipeResourcesState,
} from "@/lib/recipe";
import { RecipeEditorPanel } from "./recipe-editor-panel";

import {
  Category,
  Ingredient,
  into_ingredient_from_spec,
  Composition,
  Bridge as WasmBridge,
  new_ingredient_database_seeded_from_embedded_data,
} from "@workspace/sci-cream";

vi.mock("@workspace/sci-cream", async () => {
  const actual = await vi.importActual("@workspace/sci-cream");
  return {
    ...actual,
    into_ingredient_from_spec: vi.fn((spec) => {
      const ingredient = { name: spec.name || "Test Ingredient", composition: new Composition() };
      return ingredient;
    }),
  };
});

/** Mock implementation of ResizeObserver for testing purposes */
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

// ---------------------------------------------------------------------------
// RecipeEditorPanel component
// ---------------------------------------------------------------------------

describe("RecipeEditorPanel Component", () => {
  let recipeContext: RecipeContext;
  let recipeResources: RecipeResources;
  let setRecipeContext: Mock<(value: SetStateAction<RecipeContext>) => void>;
  let setRecipeResources: Mock<(value: SetStateAction<RecipeResources>) => void>;

  /** Wrapper component that wires spy mocks into `useState` so updates are reflected in the DOM */
  function RecipeGridWithSpy() {
    const [recipeCtx, _setRecipeContext] = useState(recipeContext);
    const [resources, _setRecipeResources] = useState(recipeResources);

    useEffect(() => {
      setRecipeContext.mockImplementation((value: SetStateAction<RecipeContext>) => {
        recipeContext = value instanceof Function ? value(recipeContext) : value;
        _setRecipeContext(recipeContext);
      });
      setRecipeResources.mockImplementation((value: SetStateAction<RecipeResources>) => {
        recipeResources = value instanceof Function ? value(recipeResources) : value;
        _setRecipeResources(recipeResources);
      });
    }, []);

    return (
      <RecipeEditorPanel
        props={{
          recipeCtxState: [recipeCtx, setRecipeContext],
          recipeResourcesState: [resources, setRecipeResources],
        }}
      />
    );
  }

  /** Get the ingredient name search input element at the given row index within a container */
  function getIngredientNameElement(container: HTMLElement, index: number) {
    return container.querySelector(
      `tbody tr:${index == 0 ? "first-child" : `nth-child(${index + 1})`} input[type="search"]`,
    ) as HTMLInputElement;
  }

  /** Get the ingredient quantity number input element at the given row index within a container */
  function getIngredientQuantityElement(container: HTMLElement, index: number) {
    return container.querySelector(
      `tbody tr:${index == 0 ? "first-child" : `nth-child(${index + 1})`} input[type="number"]`,
    ) as HTMLInputElement;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setupVitestCanvasMock();

    recipeContext = makeEmptyRecipeContext();
    recipeResources = makeRecipeResources(
      new WasmBridge(new_ingredient_database_seeded_from_embedded_data()),
    );

    setRecipeContext = vi.fn();
    setRecipeResources = vi.fn();
  });

  afterEach(async () => {
    cleanup();
    await vi.waitFor(() => {}, { timeout: 100 });
  });

  /** Build `RecipeEditorPanel` props with the given enabled recipe indices and the current spy state */
  const makeRecipeGridProps = (indices: number[]) => ({
    recipeCtxState: [recipeContext, setRecipeContext] as RecipeContextState,
    recipeResourcesState: [recipeResources, setRecipeResources] as RecipeResourcesState,
    enabledRecipeIndices: indices,
  });

  // ---- Rendering --------------------------------------------------------------------------------

  it("should render recipe selector", () => {
    const { container } = render(<RecipeEditorPanel props={makeRecipeGridProps([0, 1])} />);

    const select = container.querySelector("select") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue("0");
    expect(within(select).getByText("Recipe")).toBeInTheDocument();
  });

  it("should select the slot given by initialRecipeIdx on first render", () => {
    const { container } = render(
      <RecipeEditorPanel props={{ ...makeRecipeGridProps([0, 1, 2]), initialRecipeIdx: 2 }} />,
    );
    const select = container.querySelector("select") as HTMLSelectElement;
    expect(select).toHaveValue("2");
  });

  it("should render action buttons", () => {
    render(<RecipeEditorPanel props={makeRecipeGridProps([0, 1])} />);

    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /paste/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
  });

  it("should render table with correct number of ingredient rows", () => {
    const { container } = render(<RecipeEditorPanel props={makeRecipeGridProps([0])} />);

    const tbody = container.querySelector("tbody");
    const rows = tbody?.querySelectorAll("tr");
    expect(rows).toHaveLength(RECIPE_TOTAL_ROWS);
  });

  it("should render table headers", () => {
    render(<RecipeEditorPanel props={makeRecipeGridProps([0])} />);

    expect(screen.getByText("Ingredient")).toBeInTheDocument();
    expect(screen.getByText("Qty (g)")).toBeInTheDocument();
    expect(screen.getByText("Qty (%)")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  // ---- Updates on input -------------------------------------------------------------------------

  it("should update ingredient name on input", async () => {
    const user = userEvent.setup();
    const { container } = render(<RecipeGridWithSpy />);

    const firstIngredientInput = getIngredientNameElement(container, 0);
    expect(firstIngredientInput).toBeInTheDocument();

    await user.type(firstIngredientInput, "2% Milk");

    await waitFor(() => {
      expect(setRecipeContext).toHaveBeenCalled();
      const updatedInput = getIngredientNameElement(container, 0);
      expect(updatedInput.value).toBe("2% Milk");
    });
  });

  it("should update quantity on input", async () => {
    const user = userEvent.setup();
    const { container } = render(<RecipeGridWithSpy />);

    const firstQuantityInput = getIngredientQuantityElement(container, 0);
    expect(firstQuantityInput).toBeInTheDocument();

    await user.type(firstQuantityInput, "100");

    await waitFor(() => {
      expect(setRecipeContext).toHaveBeenCalled();
      const updatedInput = getIngredientQuantityElement(container, 0);
      expect(updatedInput.value).toBe("100");
    });
  });

  it("should update ingredient name and quantity on input", async () => {
    const user = userEvent.setup();
    const { container } = render(<RecipeGridWithSpy />);

    const firstIngredientInput = getIngredientNameElement(container, 0);
    const firstQuantityInput = getIngredientQuantityElement(container, 0);
    expect(firstIngredientInput).toBeInTheDocument();
    expect(firstQuantityInput).toBeInTheDocument();

    await user.type(firstIngredientInput, "2% Milk");
    await user.type(firstQuantityInput, "100");

    await waitFor(() => {
      expect(setRecipeContext).toHaveBeenCalled();
      const updatedNameInput = getIngredientNameElement(container, 0);
      const updatedQuantityInput = getIngredientQuantityElement(container, 0);
      expect(updatedNameInput.value).toBe("2% Milk");
      expect(updatedQuantityInput.value).toBe("100");
    });
  });

  // ---- Display ----------------------------------------------------------------------------------

  it("should display mix total when ingredients have quantities", () => {
    recipeContext.recipes[0].ingredientRows[0].quantity = 50;
    recipeContext.recipes[0].ingredientRows[1].quantity = 30;
    recipeContext.recipes[0].mixTotal = 80;

    render(<RecipeGridWithSpy />);

    expect(screen.getByText("80")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument(); // 100%
  });

  it("should display percentage for each ingredient row", () => {
    recipeContext.recipes[0].ingredientRows[0].quantity = 50;
    recipeContext.recipes[0].ingredientRows[1].quantity = 30;
    recipeContext.recipes[0].mixTotal = 80;

    const { container } = render(<RecipeEditorPanel props={makeRecipeGridProps([0])} />);

    const percentageCells = container.querySelectorAll("tbody td.comp-val");
    const firstRowPercent = percentageCells[0].textContent?.trim();
    const secondRowPercent = percentageCells[1].textContent?.trim();

    // 50/80 = 62.5%, 30/80 = 37.5%
    expect(firstRowPercent).toContain("62.5");
    expect(secondRowPercent).toContain("37.5");
  });

  it("should update and display mix total on input", async () => {
    const user = userEvent.setup();
    const { container } = render(<RecipeGridWithSpy />);

    const firstQuantityInput = getIngredientQuantityElement(container, 0);
    const secondQuantityInput = getIngredientQuantityElement(container, 1);
    expect(firstQuantityInput).toBeInTheDocument();
    expect(secondQuantityInput).toBeInTheDocument();

    await user.type(firstQuantityInput, "50");
    await waitFor(() => {
      expect(setRecipeContext).toHaveBeenCalled();
      const updatedInput = getIngredientQuantityElement(container, 0);
      expect(updatedInput.value).toBe("50");
    });

    await user.type(secondQuantityInput, "30");
    await waitFor(() => {
      expect(setRecipeContext).toHaveBeenCalled();
      const updatedInput = getIngredientQuantityElement(container, 1);
      expect(updatedInput.value).toBe("30");
    });

    await waitFor(() => {
      expect(recipeContext.recipes[0].mixTotal).toBe(80);
      expect(screen.getByText("80")).toBeInTheDocument();
    });
  });

  // ---- Recipe switch, copy, paste ---------------------------------------------------------------

  it("should change recipe when selector changes", async () => {
    recipeContext.recipes[0].ingredientRows[0].name = "Ingredient A";
    recipeContext.recipes[0].ingredientRows[0].quantity = 10;
    recipeContext.recipes[1].ingredientRows[0].name = "Ingredient B";
    recipeContext.recipes[1].ingredientRows[0].quantity = 20;

    const user = userEvent.setup();

    const { container } = render(<RecipeGridWithSpy />);

    /** Get the first ingredient name search input element within the container */
    function getFirstSearchInputElement() {
      return container.querySelector(
        `tbody tr:first-child input[type="search"]`,
      ) as HTMLInputElement;
    }

    /** Get the first ingredient quantity number input element within the container */
    function getFirstQuantityInputElement() {
      return container.querySelector(
        `tbody tr:first-child input[type="number"]`,
      ) as HTMLInputElement;
    }

    const select = container.querySelector("select") as HTMLSelectElement;
    expect(select).toHaveValue("0");
    expect(screen.queryByText("Recipe")).toBeInTheDocument();
    await waitFor(() => {
      expect(getFirstSearchInputElement().value).toBe("Ingredient A");
      expect(getFirstQuantityInputElement().value).toBe("10");
    });

    await user.selectOptions(select, "1");
    expect(select).toHaveValue("1");
    expect(screen.queryByText("Ref A")).toBeInTheDocument();
    await waitFor(() => {
      expect(getFirstSearchInputElement().value).toBe("Ingredient B");
      expect(getFirstQuantityInputElement().value).toBe("20");
    });
  });

  it("should copy recipe to clipboard", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { clipboard: { writeText: writeTextMock } });

    recipeContext.recipes[0].ingredientRows[0].name = "2% Milk";
    recipeContext.recipes[0].ingredientRows[0].quantity = 50;
    recipeContext.recipes[0].ingredientRows[1].name = "Sucrose";
    recipeContext.recipes[0].ingredientRows[1].quantity = 30;

    render(<RecipeGridWithSpy />);

    const copyButton = screen.getByRole("button", { name: /copy/i });
    await user.click(copyButton);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("Ingredient\tQty(g)\n2% Milk\t50\nSucrose\t30");
    });

    vi.unstubAllGlobals();
  });

  /** Render `RecipeEditorPanel`, click Paste with the given clipboard text, and assert the expected rows are populated */
  async function validatePaste(clipboardText: string) {
    const user = userEvent.setup();

    vi.stubGlobal("navigator", {
      clipboard: { readText: vi.fn(() => Promise.resolve(clipboardText)) },
    });

    render(<RecipeGridWithSpy />);

    const pasteButton = screen.getByRole("button", { name: /paste/i });
    await user.click(pasteButton);

    await waitFor(() => {
      expect(setRecipeContext).toHaveBeenCalled();
    });

    expect(recipeContext.recipes[0].ingredientRows[0].name).toBe("2% Milk");
    expect(recipeContext.recipes[0].ingredientRows[0].quantity).toBe(100);
    expect(recipeContext.recipes[0].ingredientRows[1].name).toBe("Sucrose");
    expect(recipeContext.recipes[0].ingredientRows[1].quantity).toBe(50);

    vi.unstubAllGlobals();
  }

  it("should paste recipe from clipboard, with header", async () => {
    await validatePaste("Ingredient\tQty(g)\n2% Milk\t100\nSucrose\t50");
  });

  it("should paste recipe from clipboard, without header", async () => {
    await validatePaste("2% Milk\t100\nSucrose\t50");
  });

  it("should clear recipe when clear button clicked", async () => {
    const user = userEvent.setup();
    recipeContext.recipes[0].ingredientRows[0].name = "2% Milk";
    recipeContext.recipes[0].ingredientRows[0].quantity = 50;

    render(<RecipeGridWithSpy />);

    const clearButton = screen.getByRole("button", { name: /clear/i });
    await user.click(clearButton);

    await waitFor(() => {
      expect(setRecipeContext).toHaveBeenCalled();
    });

    expect(recipeContext.recipes[0].ingredientRows[0].name).toBe("");
    expect(recipeContext.recipes[0].ingredientRows[0].quantity).toBeUndefined();
    expect(recipeContext.recipes[0].ingredientRows[0].ingredient).toBeUndefined();
    expect(recipeContext.recipes[0].mixTotal).toBeUndefined();
  });

  // ---- Input validation elements ----------------------------------------------------------------

  it("should show red outline for invalid ingredient names", () => {
    recipeContext.recipes[0].ingredientRows[0].name = "Invalid Ingredient";

    const { container } = render(<RecipeEditorPanel props={makeRecipeGridProps([0])} />);

    expect(getIngredientNameElement(container, 0).className).toContain("outline-red-400");
  });

  it("should show blue focus ring for valid ingredient names", () => {
    recipeContext.recipes[0].ingredientRows[0].name = "2% Milk";

    const { container } = render(<RecipeEditorPanel props={makeRecipeGridProps([0])} />);

    const firstIngredientInput = getIngredientNameElement(container, 0);
    expect(firstIngredientInput.className).toContain("focus:ring-blue-400");
    expect(firstIngredientInput.className).not.toContain("outline-red-400");
  });

  const mockIngredient = new Ingredient("2% Milk", Category.Dairy, new Composition());

  it("should WasmBridge.get_ingredient_by_name when a valid ingredient is entered", async () => {
    const get_ingredient_by_name_spy = vi.spyOn(
      recipeResources.wasmBridge,
      "get_ingredient_by_name",
    );
    get_ingredient_by_name_spy.mockReturnValue(mockIngredient);

    const { container } = render(<RecipeGridWithSpy />);

    const firstIngredientInput = getIngredientNameElement(container, 0);
    fireEvent.change(firstIngredientInput, { target: { value: "2% Milk" } });

    await waitFor(() => {
      expect(get_ingredient_by_name_spy).toHaveBeenCalledWith("2% Milk");
      expect(recipeContext.recipes[0].ingredientRows[0].ingredient).toBe(mockIngredient);
    });
  });

  it("should not WasmBridge.get_ingredient_by_name for empty string or invalid ingredient", async () => {
    const get_ingredient_by_name_spy = vi.spyOn(
      recipeResources.wasmBridge,
      "get_ingredient_by_name",
    );

    const user = userEvent.setup();

    const { container } = render(<RecipeEditorPanel props={makeRecipeGridProps([0])} />);

    const firstIngredientInput = getIngredientNameElement(container, 0);
    expect(firstIngredientInput).toBeInTheDocument();

    await user.clear(firstIngredientInput);
    await waitFor(() => {}, { timeout: 100 });
    expect(get_ingredient_by_name_spy).not.toHaveBeenCalled();

    await user.type(firstIngredientInput, "Invalid Ingredient");
    await waitFor(() => {}, { timeout: 100 });
    expect(get_ingredient_by_name_spy).not.toHaveBeenCalled();
  });

  it("should render datalist with valid ingredients", () => {
    const { container } = render(<RecipeEditorPanel props={makeRecipeGridProps([0])} />);

    const datalist = container.querySelector("#valid-ingredients");
    expect(datalist).toBeInTheDocument();

    const options = datalist?.querySelectorAll("option");
    expect(options?.length).toBeGreaterThanOrEqual(91);
    expect(options?.values().find((opt) => opt.value === "2% Milk")).toBeDefined();
    expect(options?.values().find((opt) => opt.value === "Sucrose")).toBeDefined();
    expect(options?.values().find((opt) => opt.value === "Whipping Cream")).toBeDefined();
  });

  // ---- WASM interoperability --------------------------------------------------------------------

  it("should not set WASM object in context in a bad state", async () => {
    const user = userEvent.setup();
    vi.mocked(into_ingredient_from_spec).mockReturnValue(mockIngredient);

    const { container } = render(<RecipeGridWithSpy />);

    const firstIngredientInput = getIngredientNameElement(container, 0);
    expect(firstIngredientInput).toBeInTheDocument();
    await user.type(firstIngredientInput, "2% Milk");

    await waitFor(() => {
      expect(getIngredientNameElement(container, 0).value).toBe("2% Milk");
    });

    const firstQuantityInput = getIngredientQuantityElement(container, 0);
    expect(firstQuantityInput).toBeInTheDocument();
    await user.type(firstQuantityInput, "100");

    await waitFor(() => {
      expect(getIngredientQuantityElement(container, 0).value).toBe("100");
    });

    // If we got here without "null pointer passed to rust", the test passes
    expect(getIngredientNameElement(container, 0).value).toBe("2% Milk");
    expect(getIngredientQuantityElement(container, 0).value).toBe("100");
  });
});
