import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type SetStateAction, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

import { RECIPE_TOTAL_ROWS } from "@/lib/styles/sizes";
import { makeEmptyRecipeContext, type RecipeContext, RecipeContextState } from "@/lib/recipe";
import { makeWasmResources, WasmResources } from "@/lib/wasm-resources";
import { useSessionResources, type SessionResources } from "@/lib/session-resources";
import {
  createUserRecipe,
  createUserRecipeVersion,
  renameUserRecipe,
  updateUserRecipeVersion,
} from "@/lib/data";
import { RecipeEditor, RecipeTable } from "@/app/_elements/tables/recipe";

import {
  Category,
  Ingredient,
  into_ingredient_from_spec,
  Composition,
  Bridge as WasmBridge,
  new_ingredient_database_seeded_from_embedded_data,
} from "@workspace/sci-cream";

import { RecipeID, getLightRecipe } from "@/__tests__/assets";
import { makeMockRecipe } from "@/__tests__/unit/util";
import { getSelectedOptionLabel, selectOption } from "@/__tests__/unit/select";

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

vi.mock("next-auth/react", () => ({
  useSession: vi.fn().mockReturnValue({ data: null, status: "unauthenticated" }),
}));

vi.mock("@/lib/session-resources", () => ({ useSessionResources: vi.fn() }));

vi.mock("@/lib/data", () => ({
  createUserRecipe: vi
    .fn()
    .mockResolvedValue({
      recipeId: 42,
      version: { version: 1, recipe: [], createdAt: "2026-05-17T00:00:00.000Z" },
    }),
  createUserRecipeVersion: vi
    .fn()
    .mockResolvedValue({ version: 2, recipe: [], createdAt: "2026-05-17T00:00:00.000Z" }),
  updateUserRecipeVersion: vi
    .fn()
    .mockResolvedValue({ version: 1, recipe: [], createdAt: "2026-05-17T00:00:00.000Z" }),
  renameUserRecipe: vi
    .fn()
    .mockResolvedValue({ id: 42, name: "renamed", user: 1, createdAt: new Date() }),
}));

// ---------------------------------------------------------------------------
// RecipeTable (bare, read-only)
// ---------------------------------------------------------------------------

describe("RecipeTable", () => {
  afterEach(() => {
    cleanup();
  });

  describe("Structure", () => {
    it("should render a <table> with the expected column headers", () => {
      const recipe = makeMockRecipe(RecipeID.Main);
      const { container } = render(<RecipeTable recipe={recipe} />);
      const headers = Array.from(container.querySelectorAll("thead tr:first-child th")).map(
        (th) => th.textContent,
      );
      expect(headers).toEqual(["Ingredient", "Qty (g)", "Qty (%)"]);
    });

    it("should render the totals row with the mix total in grams", () => {
      const recipe = makeMockRecipe(RecipeID.Main);
      const { container } = render(<RecipeTable recipe={recipe} />);
      const totalQtyCell = container.querySelector("thead tr:nth-child(2) td.comp-val")!;
      expect(totalQtyCell.textContent).toBe(recipe.mixTotal!.toFixed(0));
    });
  });

  describe("Row Filtering", () => {
    it("should render one row per non-empty ingredient row", () => {
      const recipe = makeMockRecipe(RecipeID.Main);
      const { container } = render(<RecipeTable recipe={recipe} />);
      const bodyRows = container.querySelectorAll("tbody tr");
      expect(bodyRows).toHaveLength(getLightRecipe(RecipeID.Main).length);
    });
  });

  describe("Cell Values", () => {
    it("should display ingredient name and quantity for each row", () => {
      const recipe = makeMockRecipe(RecipeID.Main);
      const { container } = render(<RecipeTable recipe={recipe} />);
      const bodyRows = Array.from(container.querySelectorAll("tbody tr"));
      const light = getLightRecipe(RecipeID.Main);
      bodyRows.forEach((row, idx) => {
        const cells = row.querySelectorAll("td");
        expect(cells[0].textContent).toBe(light[idx][0]);
        expect(cells[1].textContent?.trim()).toBe(String(light[idx][1]));
      });
    });
  });
});

// ---------------------------------------------------------------------------
// RecipeEditor (view: toolbar + editable table + state management)
// ---------------------------------------------------------------------------

describe("RecipeEditor", () => {
  let recipeContext: RecipeContext;
  let wasmResources: WasmResources;
  let setRecipeContext: Mock<(value: SetStateAction<RecipeContext>) => void>;
  let refreshUserRecipes: Mock<() => Promise<void>>;

  /** Point the (mocked) session-resources context at the current `wasmResources` and spies. */
  function mockSessionResources() {
    vi.mocked(useSessionResources).mockReturnValue({
      wasmResourcesState: [wasmResources, vi.fn()],
      savedRecipes: [],
      userIngredientSpecs: [],
      refreshUserRecipes,
      refreshUserIngredients: vi.fn().mockResolvedValue(undefined),
    } satisfies SessionResources);
  }

  /** Wrapper component that wires the recipe-context spy into `useState` so edits reflect in DOM */
  function RecipeEditorWithSpy() {
    const [recipeCtx, _setRecipeContext] = useState(recipeContext);

    useEffect(() => {
      setRecipeContext.mockImplementation((value: SetStateAction<RecipeContext>) => {
        recipeContext = value instanceof Function ? value(recipeContext) : value;
        _setRecipeContext(recipeContext);
      });
    }, []);

    return <RecipeEditor recipeCtxState={[recipeCtx, setRecipeContext]} />;
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
    wasmResources = makeWasmResources(
      new WasmBridge(new_ingredient_database_seeded_from_embedded_data()),
    );

    setRecipeContext = vi.fn();
    refreshUserRecipes = vi.fn().mockResolvedValue(undefined);
    mockSessionResources();
  });

  afterEach(async () => {
    cleanup();
    await vi.waitFor(() => {}, { timeout: 100 });
  });

  /** Build `RecipeEditor` props with the given enabled recipe indices and the current spy state */
  const makeRecipeEditorProps = (indices: number[]) => ({
    recipeCtxState: [recipeContext, setRecipeContext] as RecipeContextState,
    enabledRecipeIndices: indices,
  });

  // ---- Rendering --------------------------------------------------------------------------------

  it("should render recipe selector", () => {
    const { container } = render(<RecipeEditor {...makeRecipeEditorProps([0, 1])} />);

    expect(getSelectedOptionLabel(container, "#recipe-selection")).toBe("Recipe");
  });

  it("should select the slot given by urlSlot on first render", () => {
    const { container } = render(
      <RecipeEditor {...makeRecipeEditorProps([0, 1, 2])} urlSlot={2} />,
    );
    expect(getSelectedOptionLabel(container, "#recipe-selection")).toBe("Ref B");
  });

  it("should render action buttons", () => {
    render(<RecipeEditor {...makeRecipeEditorProps([0, 1])} />);

    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /paste/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
  });

  it("should render table with correct number of ingredient rows", () => {
    const { container } = render(<RecipeEditor {...makeRecipeEditorProps([0])} />);

    const tbody = container.querySelector("tbody");
    const rows = tbody?.querySelectorAll("tr");
    expect(rows).toHaveLength(RECIPE_TOTAL_ROWS);
  });

  it("should render table headers", () => {
    render(<RecipeEditor {...makeRecipeEditorProps([0])} />);

    expect(screen.getByText("Ingredient")).toBeInTheDocument();
    expect(screen.getByText("Qty (g)")).toBeInTheDocument();
    expect(screen.getByText("Qty (%)")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  // ---- Updates on input -------------------------------------------------------------------------

  it("should update ingredient name on input", async () => {
    const user = userEvent.setup();
    const { container } = render(<RecipeEditorWithSpy />);

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
    const { container } = render(<RecipeEditorWithSpy />);

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
    const { container } = render(<RecipeEditorWithSpy />);

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

  // ---- onUserEdit (cancels continuous-balance mode) --------------------------------------------

  it("fires onUserEdit when a quantity is edited", async () => {
    const user = userEvent.setup();
    const onUserEdit = vi.fn();
    const { container } = render(
      <RecipeEditor recipeCtxState={[recipeContext, setRecipeContext]} onUserEdit={onUserEdit} />,
    );

    await user.type(getIngredientQuantityElement(container, 0), "5");
    expect(onUserEdit).toHaveBeenCalled();
  });

  it("fires onUserEdit when an ingredient name is edited", async () => {
    const user = userEvent.setup();
    const onUserEdit = vi.fn();
    const { container } = render(
      <RecipeEditor recipeCtxState={[recipeContext, setRecipeContext]} onUserEdit={onUserEdit} />,
    );

    await user.type(getIngredientNameElement(container, 0), "M");
    expect(onUserEdit).toHaveBeenCalled();
  });

  it("fires onUserEdit when the recipe is cleared", async () => {
    const user = userEvent.setup();
    const onUserEdit = vi.fn();
    render(
      <RecipeEditor recipeCtxState={[recipeContext, setRecipeContext]} onUserEdit={onUserEdit} />,
    );

    await user.click(screen.getByRole("button", { name: /clear/i }));
    expect(onUserEdit).toHaveBeenCalled();
  });

  it("does not fire onUserEdit on mount (storage hydration is not a user edit)", () => {
    const onUserEdit = vi.fn();
    render(
      <RecipeEditor recipeCtxState={[recipeContext, setRecipeContext]} onUserEdit={onUserEdit} />,
    );
    expect(onUserEdit).not.toHaveBeenCalled();
  });

  // ---- Display ----------------------------------------------------------------------------------

  it("should display mix total when ingredients have quantities", () => {
    recipeContext.recipes[0].ingredientRows[0].quantity = 50;
    recipeContext.recipes[0].ingredientRows[1].quantity = 30;
    recipeContext.recipes[0].mixTotal = 80;

    render(<RecipeEditorWithSpy />);

    expect(screen.getByText("80")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument(); // 100%
  });

  it("should display percentage for each ingredient row", () => {
    recipeContext.recipes[0].ingredientRows[0].quantity = 50;
    recipeContext.recipes[0].ingredientRows[1].quantity = 30;
    recipeContext.recipes[0].mixTotal = 80;

    const { container } = render(<RecipeEditor {...makeRecipeEditorProps([0])} />);

    const percentageCells = container.querySelectorAll("tbody td.comp-val");
    const firstRowPercent = percentageCells[0].textContent?.trim();
    const secondRowPercent = percentageCells[1].textContent?.trim();

    // 50/80 = 62.5%, 30/80 = 37.5%
    expect(firstRowPercent).toContain("62.5");
    expect(secondRowPercent).toContain("37.5");
  });

  it("should update and display mix total on input", async () => {
    const user = userEvent.setup();
    const { container } = render(<RecipeEditorWithSpy />);

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

    const { container } = render(<RecipeEditorWithSpy />);

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

    expect(getSelectedOptionLabel(container, "#recipe-selection")).toBe("Recipe");
    await waitFor(() => {
      expect(getFirstSearchInputElement().value).toBe("Ingredient A");
      expect(getFirstQuantityInputElement().value).toBe("10");
    });

    await selectOption(container, "#recipe-selection", "Ref A");
    expect(getSelectedOptionLabel(container, "#recipe-selection")).toBe("Ref A");
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

    render(<RecipeEditorWithSpy />);

    const copyButton = screen.getByRole("button", { name: /copy/i });
    await user.click(copyButton);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("Ingredient\tQty(g)\n2% Milk\t50\nSucrose\t30");
    });

    vi.unstubAllGlobals();
  });

  /** Render `RecipeEditor`, click Paste with the given clipboard text, and assert the expected rows are populated */
  async function validatePaste(clipboardText: string) {
    const user = userEvent.setup();

    vi.stubGlobal("navigator", {
      clipboard: { readText: vi.fn(() => Promise.resolve(clipboardText)) },
    });

    render(<RecipeEditorWithSpy />);

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

    render(<RecipeEditorWithSpy />);

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

    const { container } = render(<RecipeEditor {...makeRecipeEditorProps([0])} />);

    expect(getIngredientNameElement(container, 0).className).toContain("outline-red-400");
  });

  it("should show blue focus ring for valid ingredient names", () => {
    recipeContext.recipes[0].ingredientRows[0].name = "2% Milk";

    const { container } = render(<RecipeEditor {...makeRecipeEditorProps([0])} />);

    const firstIngredientInput = getIngredientNameElement(container, 0);
    expect(firstIngredientInput.className).toContain("focus:ring-blue-400");
    expect(firstIngredientInput.className).not.toContain("outline-red-400");
  });

  const mockIngredient = new Ingredient("2% Milk", Category.Dairy, new Composition());

  it("should WasmBridge.get_ingredient_by_name when a valid ingredient is entered", async () => {
    const get_ingredient_by_name_spy = vi.spyOn(wasmResources.wasmBridge, "get_ingredient_by_name");
    get_ingredient_by_name_spy.mockReturnValue(mockIngredient);

    const { container } = render(<RecipeEditorWithSpy />);

    const firstIngredientInput = getIngredientNameElement(container, 0);
    fireEvent.change(firstIngredientInput, { target: { value: "2% Milk" } });

    await waitFor(() => {
      expect(get_ingredient_by_name_spy).toHaveBeenCalledWith("2% Milk");
      expect(recipeContext.recipes[0].ingredientRows[0].ingredient).toBe(mockIngredient);
    });
  });

  it("should not WasmBridge.get_ingredient_by_name for empty string or invalid ingredient", async () => {
    const get_ingredient_by_name_spy = vi.spyOn(wasmResources.wasmBridge, "get_ingredient_by_name");

    const user = userEvent.setup();

    const { container } = render(<RecipeEditor {...makeRecipeEditorProps([0])} />);

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
    const { container } = render(<RecipeEditor {...makeRecipeEditorProps([0])} />);

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

    const { container } = render(<RecipeEditorWithSpy />);

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

  // ---- Recipe name input ------------------------------------------------------------------------

  describe("Recipe name input", () => {
    it("renders an editable recipe name input", () => {
      render(<RecipeEditor {...makeRecipeEditorProps([0])} />);
      expect(screen.getByLabelText("Recipe name")).toBeInTheDocument();
    });

    it("updates the recipe context when the user types a name", () => {
      render(<RecipeEditorWithSpy />);
      fireEvent.change(screen.getByLabelText("Recipe name"), { target: { value: "My Recipe" } });
      expect(setRecipeContext).toHaveBeenCalled();
      expect(recipeContext.recipes[0].name).toBe("My Recipe");
    });
  });

  // ---- Save button ------------------------------------------------------------------------------

  describe("Save button", () => {
    /** Populate slot 0 of `recipeContext` with the given name and a single valid ingredient row */
    function populateRecipe(name: string) {
      recipeContext.recipes[0].name = name;
      recipeContext.recipes[0].ingredientRows[0].name = "Whole Milk";
      recipeContext.recipes[0].ingredientRows[0].quantity = 500;
      recipeContext.recipes[0].mixTotal = 500;
    }

    /** Mock useSession to return an authenticated session with `a@b.c` */
    function mockSignedIn() {
      vi.mocked(useSession).mockReturnValue({
        data: { user: { email: "a@b.c" }, expires: "" },
        status: "authenticated",
        update: vi.fn(),
      });
    }

    it("renders the Save button", () => {
      render(<RecipeEditor {...makeRecipeEditorProps([0])} />);
      // When signed out, both Save and Save-as-new-version share the "Sign in to save recipes"
      // tooltip, so exactly two buttons match the regex.
      expect(screen.getAllByTitle(/Sign in to save recipes|Save recipe/)).toHaveLength(2);
    });

    it("is disabled when the user is not signed in", () => {
      populateRecipe("My Recipe");
      render(<RecipeEditor {...makeRecipeEditorProps([0])} />);
      // Both Save and Save-as-new-version share this disabled-state tooltip; verify both
      screen
        .getAllByTitle("Sign in to save recipes")
        .forEach((button) => expect(button).toBeDisabled());
    });

    it("is disabled when the recipe has no name", () => {
      mockSignedIn();
      populateRecipe("");
      render(<RecipeEditor {...makeRecipeEditorProps([0])} />);
      expect(screen.getByTitle("Enter a name to save")).toBeDisabled();
    });

    it("is disabled when the recipe is empty", () => {
      mockSignedIn();
      recipeContext.recipes[0].name = "My Recipe";
      render(<RecipeEditor {...makeRecipeEditorProps([0])} />);
      expect(screen.getByTitle("Add ingredients to save")).toBeDisabled();
    });

    it("is disabled when the selected slot is not the main recipe", () => {
      mockSignedIn();
      // Populate slot 1 (Ref A) with an otherwise-saveable recipe to isolate the slot guard
      recipeContext.recipes[1].name = "Ref Recipe";
      recipeContext.recipes[1].ingredientRows[0].name = "Whole Milk";
      recipeContext.recipes[1].ingredientRows[0].quantity = 500;
      recipeContext.recipes[1].mixTotal = 500;
      render(<RecipeEditor {...makeRecipeEditorProps([0, 1])} urlSlot={1} />);
      // Both Save and Save-as-new-version share this disabled-state tooltip; verify both
      screen
        .getAllByTitle("Select main recipe to save")
        .forEach((button) => expect(button).toBeDisabled());
    });

    it("calls createUserRecipe with the user email, name, and rows for a new recipe (no recipeId)", async () => {
      mockSignedIn();
      populateRecipe("My Recipe");
      render(<RecipeEditor {...makeRecipeEditorProps([0])} />);

      fireEvent.click(screen.getByTitle("Save recipe"));
      await waitFor(() => {
        expect(createUserRecipe).toHaveBeenCalledWith("a@b.c", "My Recipe", [["Whole Milk", 500]]);
      });
    });

    it("calls updateUserRecipeVersion when the recipe already has an identity", async () => {
      mockSignedIn();
      populateRecipe("My Recipe");
      // Mark the recipe as a loaded version of an existing saved recipe with a clean baseline
      recipeContext.recipes[0].savedRef = { recipeId: 7, versionNumber: 3 };
      recipeContext.recipes[0].baseline = { name: "My Recipe", serializedRows: "" };
      render(<RecipeEditor {...makeRecipeEditorProps([0])} />);

      fireEvent.click(
        screen.getByTitle((value) => /Save changes to version 3|Saved — version 3/.test(value)),
      );
      await waitFor(() => {
        expect(updateUserRecipeVersion).toHaveBeenCalledWith("a@b.c", 7, 3, {
          recipe: [["Whole Milk", 500]],
        });
      });
    });

    it("renames the recipe before update when the name was edited since baseline", async () => {
      mockSignedIn();
      populateRecipe("My Recipe Renamed");
      recipeContext.recipes[0].savedRef = { recipeId: 7, versionNumber: 1 };
      // Baseline name differs from current name -> renameUserRecipe should be called
      recipeContext.recipes[0].baseline = { name: "Original Name", serializedRows: "" };
      render(<RecipeEditor {...makeRecipeEditorProps([0])} />);

      fireEvent.click(
        screen.getByTitle((value) => /Save changes to version 1|Saved — version 1/.test(value)),
      );
      await waitFor(() => {
        expect(renameUserRecipe).toHaveBeenCalledWith("a@b.c", 7, "My Recipe Renamed");
        expect(updateUserRecipeVersion).toHaveBeenCalledWith("a@b.c", 7, 1, {
          recipe: [["Whole Milk", 500]],
        });
      });
    });

    it("renders 'Save as new version' disabled for an anonymous recipe with no savedRef", () => {
      mockSignedIn();
      populateRecipe("My Recipe");
      render(<RecipeEditor {...makeRecipeEditorProps([0])} />);
      const button = screen.getByTitle(
        "Save the recipe at least once before creating a new version",
      );
      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled();
    });

    it("renders 'Save as new version' enabled when a saved recipe is loaded", () => {
      mockSignedIn();
      populateRecipe("My Recipe");
      recipeContext.recipes[0].savedRef = { recipeId: 7, versionNumber: 1 };
      render(<RecipeEditor {...makeRecipeEditorProps([0])} />);
      const button = screen.getByTitle("Save as new version");
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });

    it("calls createUserRecipeVersion when 'Save as new version' is clicked", async () => {
      mockSignedIn();
      populateRecipe("My Recipe");
      recipeContext.recipes[0].savedRef = { recipeId: 7, versionNumber: 1 };
      recipeContext.recipes[0].baseline = { name: "My Recipe", serializedRows: "" };

      render(<RecipeEditor {...makeRecipeEditorProps([0])} />);
      fireEvent.click(screen.getByRole("button", { name: "Save as new version" }));
      await waitFor(() => {
        expect(createUserRecipeVersion).toHaveBeenCalledWith("a@b.c", 7, [["Whole Milk", 500]]);
      });
    });
  });

  describe("Dirty indicator", () => {
    /** Populate slot 0 with a saved-recipe identity that matches its baseline (i.e. clean) */
    function populateLoadedRecipeClean() {
      recipeContext.recipes[0].name = "Loaded Recipe";
      recipeContext.recipes[0].ingredientRows[0].name = "Whole Milk";
      recipeContext.recipes[0].ingredientRows[0].quantity = 500;
      recipeContext.recipes[0].mixTotal = 500;
      recipeContext.recipes[0].savedRef = { recipeId: 7, versionNumber: 1 };
      recipeContext.recipes[0].baseline = {
        name: "Loaded Recipe",
        serializedRows: "Ingredient\tQty(g)\nWhole Milk\t500",
      };
    }

    it("does not show the unsaved-changes dot when the recipe matches baseline", () => {
      populateLoadedRecipeClean();
      render(<RecipeEditor {...makeRecipeEditorProps([0])} />);
      expect(screen.queryByLabelText("Unsaved changes")).not.toBeInTheDocument();
    });

    it("does not show the unsaved-changes dot for a brand-new recipe with no baseline", () => {
      recipeContext.recipes[0].name = "Anon Recipe";
      recipeContext.recipes[0].ingredientRows[0].name = "Whole Milk";
      recipeContext.recipes[0].ingredientRows[0].quantity = 500;
      recipeContext.recipes[0].mixTotal = 500;
      render(<RecipeEditor {...makeRecipeEditorProps([0])} />);
      expect(screen.queryByLabelText("Unsaved changes")).not.toBeInTheDocument();
    });

    it("shows the unsaved-changes dot when a loaded recipe is renamed", () => {
      populateLoadedRecipeClean();
      recipeContext.recipes[0].name = "Loaded Recipe (edited)";
      render(<RecipeEditor {...makeRecipeEditorProps([0])} />);
      expect(screen.getByLabelText("Unsaved changes")).toBeInTheDocument();
    });
  });

  describe("Version badge", () => {
    it("shows the version badge for a loaded recipe", () => {
      recipeContext.recipes[0].name = "Loaded Recipe";
      recipeContext.recipes[0].savedRef = { recipeId: 7, versionNumber: 3 };
      render(<RecipeEditor {...makeRecipeEditorProps([0])} />);
      expect(screen.getByTitle("Editing version 3")).toBeInTheDocument();
    });

    it("does not show the version badge for an anonymous recipe", () => {
      recipeContext.recipes[0].name = "Anon Recipe";
      render(<RecipeEditor {...makeRecipeEditorProps([0])} />);
      expect(screen.queryByTitle(/Editing version/)).not.toBeInTheDocument();
    });
  });
});
