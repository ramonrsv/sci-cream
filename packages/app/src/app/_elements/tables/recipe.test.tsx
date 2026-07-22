import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type SetStateAction, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

import { RECIPE_TOTAL_ROWS } from "@/lib/styles/sizes";
import {
  makeEmptyRecipeContext,
  type RecipeContext,
  RecipeContextState,
} from "@/lib/recipe/recipe";
import { makeWasmResources, WasmResources } from "@/lib/resources/wasm";
import { useSessionResources, type SessionResources } from "@/lib/resources/session";
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

vi.mock("@/lib/resources/session", () => ({ useSessionResources: vi.fn() }));

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

  describe("Evaporation", () => {
    it("shows no yield readout when there is no evaporation", () => {
      const recipe = makeMockRecipe(RecipeID.Main);
      render(<RecipeTable recipe={recipe} />);
      expect(screen.queryByTitle(/Yield/)).not.toBeInTheDocument();
    });

    it("shows the resulting yield inline in the Total row when evaporation is set", () => {
      const recipe = makeMockRecipe(RecipeID.Main);
      recipe.evaporation = recipe.mixTotal! * 0.1; // remove 10% of the ingredient mass as water
      render(<RecipeTable recipe={recipe} />);

      const yieldReadout = screen.getByTitle(/Yield/);
      expect(yieldReadout.closest("td")).toHaveTextContent("Total");
      expect(yieldReadout).toHaveTextContent((recipe.mixTotal! - recipe.evaporation).toFixed(0));
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
  function mockSessionResources(savedRecipes: SessionResources["savedRecipes"] = []) {
    vi.mocked(useSessionResources).mockReturnValue({
      wasmResourcesState: [wasmResources, vi.fn()],
      savedRecipes,
      userIngredientSpecs: [],
      refreshUserRecipes,
      refreshUserIngredients: vi.fn().mockResolvedValue(undefined),
    } satisfies SessionResources);
  }

  /** Wrapper component that wires the recipe-context spy into `useState` so edits reflect in DOM */
  function RecipeEditorWithSpy({ onUserQuantityEdit }: { onUserQuantityEdit?: () => void } = {}) {
    const [recipeCtx, _setRecipeContext] = useState(recipeContext);

    useEffect(() => {
      setRecipeContext.mockImplementation((value: SetStateAction<RecipeContext>) => {
        recipeContext = value instanceof Function ? value(recipeContext) : value;
        _setRecipeContext(recipeContext);
      });
    }, []);

    return (
      <RecipeEditor
        recipeCtxState={[recipeCtx, setRecipeContext]}
        onUserQuantityEdit={onUserQuantityEdit}
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

  /** A minimal stand-in for a resolved WASM `Ingredient`; `free` is a no-op (no real pointer). */
  const stubIngredient = (name: string) =>
    ({ name, composition: new Composition(), free: () => {} }) as unknown as Ingredient;

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
    // @todo Temporarily filter out last row to avoid a scrollbar on default panel height
    expect(rows).toHaveLength(RECIPE_TOTAL_ROWS - 1);
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

  // ---- onUserQuantityEdit (cancels continuous-balance mode) --------------------------------------------

  it("fires onUserQuantityEdit when a quantity is edited", async () => {
    const user = userEvent.setup();
    const onUserQuantityEdit = vi.fn();
    const { container } = render(
      <RecipeEditor
        recipeCtxState={[recipeContext, setRecipeContext]}
        onUserQuantityEdit={onUserQuantityEdit}
      />,
    );

    await user.type(getIngredientQuantityElement(container, 0), "5");
    expect(onUserQuantityEdit).toHaveBeenCalled();
  });

  it("does not fire onUserQuantityEdit when an ingredient name is edited", async () => {
    const user = userEvent.setup();
    const onUserQuantityEdit = vi.fn();
    const { container } = render(
      <RecipeEditor
        recipeCtxState={[recipeContext, setRecipeContext]}
        onUserQuantityEdit={onUserQuantityEdit}
      />,
    );

    await user.type(getIngredientNameElement(container, 0), "M");
    expect(onUserQuantityEdit).not.toHaveBeenCalled();
  });

  it("does not fire onUserQuantityEdit when evaporation is edited", async () => {
    const user = userEvent.setup();
    const onUserQuantityEdit = vi.fn();
    render(
      <RecipeEditor
        recipeCtxState={[recipeContext, setRecipeContext]}
        onUserQuantityEdit={onUserQuantityEdit}
      />,
    );

    await user.type(screen.getByTestId("recipe-evaporation-grams"), "5");
    expect(onUserQuantityEdit).not.toHaveBeenCalled();
  });

  it("does not fire onUserQuantityEdit when the recipe is cleared", async () => {
    const user = userEvent.setup();
    const onUserQuantityEdit = vi.fn();
    render(
      <RecipeEditor
        recipeCtxState={[recipeContext, setRecipeContext]}
        onUserQuantityEdit={onUserQuantityEdit}
      />,
    );

    await user.click(screen.getByRole("button", { name: /clear/i }));
    expect(onUserQuantityEdit).not.toHaveBeenCalled();
  });

  it("fires onUserQuantityEdit when a recipe is pasted", async () => {
    const user = userEvent.setup();
    const onUserQuantityEdit = vi.fn();
    vi.stubGlobal("navigator", {
      clipboard: { readText: vi.fn(() => Promise.resolve("2% Milk\t100\nSucrose\t50")) },
    });
    render(<RecipeEditorWithSpy onUserQuantityEdit={onUserQuantityEdit} />);

    await user.click(screen.getByRole("button", { name: /paste/i }));
    await waitFor(() => expect(onUserQuantityEdit).toHaveBeenCalled());

    vi.unstubAllGlobals();
  });

  it("does not fire onUserQuantityEdit on mount (storage hydration is not a user edit)", () => {
    const onUserQuantityEdit = vi.fn();
    render(
      <RecipeEditor
        recipeCtxState={[recipeContext, setRecipeContext]}
        onUserQuantityEdit={onUserQuantityEdit}
      />,
    );
    expect(onUserQuantityEdit).not.toHaveBeenCalled();
  });

  // ---- Lock toggle ------------------------------------------------------------------------------

  /** Type a valid ingredient + quantity into row 0 so its lock control becomes available */
  async function fillRowZero(user: ReturnType<typeof userEvent.setup>, container: HTMLElement) {
    await user.type(getIngredientNameElement(container, 0), "Whole Milk");
    await user.type(getIngredientQuantityElement(container, 0), "100");
  }

  /** Type a valid ingredient + quantity into the given row so its lock control becomes available */
  async function fillRow(
    user: ReturnType<typeof userEvent.setup>,
    container: HTMLElement,
    index: number,
    name: string,
  ) {
    await user.type(getIngredientNameElement(container, index), name);
    await user.type(getIngredientQuantityElement(container, index), "100");
  }

  it("shows no lock control on an empty row", () => {
    const { container } = render(<RecipeEditorWithSpy />);
    expect(container.querySelector('[data-testid="recipe-row-0-lock"]')).toBeNull();
  });

  it("shows a lock control on a zero-amount row (locking pins it out of the balance)", async () => {
    const user = userEvent.setup();
    const { container } = render(<RecipeEditorWithSpy />);
    await user.type(getIngredientNameElement(container, 0), "Whole Milk");
    await user.type(getIngredientQuantityElement(container, 0), "0");

    const lockButton = await screen.findByTestId("recipe-row-0-lock");
    expect(lockButton).toHaveAttribute("aria-pressed", "false");
    await user.click(lockButton);
    await waitFor(() => {
      expect(screen.getByTestId("recipe-row-0-lock")).toHaveAttribute("aria-pressed", "true");
    });
  });

  it("shows a lock control once a row has a valid ingredient and quantity, and toggles it", async () => {
    const user = userEvent.setup();
    const { container } = render(<RecipeEditorWithSpy />);
    await fillRowZero(user, container);

    const lockButton = await screen.findByTestId("recipe-row-0-lock");
    expect(lockButton).toHaveAttribute("aria-pressed", "false");

    await user.click(lockButton);
    await waitFor(() => {
      expect(screen.getByTestId("recipe-row-0-lock")).toHaveAttribute("aria-pressed", "true");
    });
  });

  it("does not fire onUserQuantityEdit when a lock is toggled (keeps continuous-balance mode on)", async () => {
    const user = userEvent.setup();
    const onUserQuantityEdit = vi.fn();
    const { container } = render(<RecipeEditorWithSpy onUserQuantityEdit={onUserQuantityEdit} />);
    await fillRowZero(user, container);
    onUserQuantityEdit.mockClear(); // ignore the edits that set up the row

    await user.click(await screen.findByTestId("recipe-row-0-lock"));
    expect(onUserQuantityEdit).not.toHaveBeenCalled();
  });

  it("shows no lock-all control until at least one row is lockable", () => {
    const { container } = render(<RecipeEditorWithSpy />);
    expect(container.querySelector('[data-testid="recipe-lock-all"]')).toBeNull();
  });

  it("lock-all pins every lockable row, then unlocks them all", async () => {
    const user = userEvent.setup();
    const { container } = render(<RecipeEditorWithSpy />);
    await fillRow(user, container, 0, "Whole Milk");
    await fillRow(user, container, 1, "Whipping Cream");

    const lockAll = await screen.findByTestId("recipe-lock-all");
    expect(lockAll).toHaveAttribute("aria-pressed", "false");

    await user.click(lockAll);
    await waitFor(() => {
      expect(screen.getByTestId("recipe-lock-all")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByTestId("recipe-row-0-lock")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByTestId("recipe-row-1-lock")).toHaveAttribute("aria-pressed", "true");
    });

    await user.click(screen.getByTestId("recipe-lock-all"));
    await waitFor(() => {
      expect(screen.getByTestId("recipe-lock-all")).toHaveAttribute("aria-pressed", "false");
      expect(screen.getByTestId("recipe-row-0-lock")).toHaveAttribute("aria-pressed", "false");
      expect(screen.getByTestId("recipe-row-1-lock")).toHaveAttribute("aria-pressed", "false");
    });
  });

  it("lock-all reads unlocked while only some rows are locked, then locks the rest", async () => {
    const user = userEvent.setup();
    const { container } = render(<RecipeEditorWithSpy />);
    await fillRow(user, container, 0, "Whole Milk");
    await fillRow(user, container, 1, "Whipping Cream");

    await user.click(await screen.findByTestId("recipe-row-0-lock")); // lock only row 0
    await waitFor(() => {
      expect(screen.getByTestId("recipe-row-0-lock")).toHaveAttribute("aria-pressed", "true");
    });
    // Not all rows are locked, so the totals toggle still reads unlocked.
    expect(screen.getByTestId("recipe-lock-all")).toHaveAttribute("aria-pressed", "false");

    await user.click(screen.getByTestId("recipe-lock-all"));
    await waitFor(() => {
      expect(screen.getByTestId("recipe-row-1-lock")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByTestId("recipe-lock-all")).toHaveAttribute("aria-pressed", "true");
    });
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
    const rows = recipeContext.recipes[0].ingredientRows;
    rows[0].name = "Whole Milk";
    rows[0].ingredient = stubIngredient("Whole Milk");
    rows[0].quantity = 50;
    rows[1].name = "Sucrose";
    rows[1].ingredient = stubIngredient("Sucrose");
    rows[1].quantity = 30;
    recipeContext.recipes[0].mixTotal = 80;

    const { container } = render(<RecipeEditor {...makeRecipeEditorProps([0])} />);

    const percentageCells = container.querySelectorAll("tbody td.comp-val");
    const firstRowPercent = percentageCells[0].textContent?.trim();
    const secondRowPercent = percentageCells[1].textContent?.trim();

    // 50/80 = 62.5%, 30/80 = 37.5%
    expect(firstRowPercent).toContain("62.5");
    expect(secondRowPercent).toContain("37.5");
  });

  it("outlines an orphan quantity (no valid ingredient) and shows no percentage for it", async () => {
    const user = userEvent.setup();
    const { container } = render(<RecipeEditorWithSpy />);

    // A quantity typed on a row with no valid ingredient name is an orphan: it isn't counted.
    await user.type(getIngredientQuantityElement(container, 0), "50");

    const quantityInput = getIngredientQuantityElement(container, 0);
    await waitFor(() => expect(quantityInput.className).toContain("outline-red-400"));

    const percentageCells = container.querySelectorAll("tbody td.comp-val");
    expect(percentageCells[0].textContent?.trim()).toBe("");
  });

  it("should update and display mix total on input", async () => {
    const user = userEvent.setup();
    const { container } = render(<RecipeEditorWithSpy />);

    // Name each row so its quantity resolves to a valid ingredient and counts toward the total.
    await user.type(getIngredientNameElement(container, 0), "Whole Milk");
    await user.type(getIngredientNameElement(container, 1), "Sucrose");

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

  it("preserves the slot's name and saved identity when pasting", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("navigator", {
      clipboard: { readText: vi.fn(() => Promise.resolve("2% Milk\t100\nSucrose\t50")) },
    });

    const savedRef = { recipeId: 7, versionNumber: 2 };
    const baseline = { name: "My Recipe", serializedRows: "Ingredient\tQty(g)\nWhole Milk\t500" };
    recipeContext.recipes[0].name = "My Recipe";
    recipeContext.recipes[0].savedRef = savedRef;
    recipeContext.recipes[0].baseline = baseline;

    render(<RecipeEditorWithSpy />);
    await user.click(screen.getByRole("button", { name: /paste/i }));

    await waitFor(() => {
      expect(setRecipeContext).toHaveBeenCalled();
    });

    // Name and saved-recipe identity survive the paste; only the rows are replaced.
    expect(recipeContext.recipes[0].name).toBe("My Recipe");
    expect(recipeContext.recipes[0].savedRef).toEqual(savedRef);
    expect(recipeContext.recipes[0].baseline).toEqual(baseline);
    expect(recipeContext.recipes[0].ingredientRows[0].name).toBe("2% Milk");
    expect(recipeContext.recipes[0].ingredientRows[1].name).toBe("Sucrose");

    vi.unstubAllGlobals();
  });

  it("should clear recipe when clear button clicked", async () => {
    const user = userEvent.setup();
    recipeContext.recipes[0].ingredientRows[0].name = "2% Milk";
    recipeContext.recipes[0].ingredientRows[0].quantity = 50;
    recipeContext.recipes[0].evaporation = 20;

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
    expect(recipeContext.recipes[0].evaporation).toBe(0);
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
    it("renders the Save button", () => {
      render(<RecipeEditor {...makeRecipeEditorProps([0])} />);
      expect(screen.getByRole("button", { name: "Save recipe" })).toBeInTheDocument();
    });

    it("is disabled when the user is not signed in", () => {
      populateRecipe("My Recipe");
      render(<RecipeEditor {...makeRecipeEditorProps([0])} />);
      // Both the Save and the always-shown branch button carry the signed-out title, disabled
      const controls = screen.getAllByTitle("Sign in to save recipes");
      expect(controls).toHaveLength(2);
      controls.forEach((el) => expect(el).toBeDisabled());
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
      // Off the main recipe, both the Save and branch buttons carry the wrong-slot title, disabled
      const controls = screen.getAllByTitle("Select main recipe to save");
      expect(controls).toHaveLength(2);
      controls.forEach((el) => expect(el).toBeDisabled());
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

    it("shows a disabled 'Save as new version' button, but no input, for a recipe with no savedRef", () => {
      mockSignedIn();
      populateRecipe("My Recipe");
      render(<RecipeEditor {...makeRecipeEditorProps([0])} />);
      // The branch button is always shown; without a savedRef it is disabled and the input is hidden
      expect(screen.getByRole("button", { name: "Save as new version" })).toBeDisabled();
      expect(screen.queryByLabelText("New version")).not.toBeInTheDocument();
    });

    it("renders 'Save as new version' enabled when a saved recipe is loaded", () => {
      mockSignedIn();
      populateRecipe("My Recipe");
      recipeContext.recipes[0].savedRef = { recipeId: 7, versionNumber: 1 };
      render(<RecipeEditor {...makeRecipeEditorProps([0])} />);
      const button = screen.getByRole("button", { name: "Save as new version" });
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
        // A blank new-version input passes an empty meta so the server auto-materializes only when
        // the recipe has opted into named versions.
        expect(createUserRecipeVersion).toHaveBeenCalledWith("a@b.c", 7, [["Whole Milk", 500]], {});
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

  // ---- Evaporation ------------------------------------------------------------------------------

  describe("Evaporation", () => {
    /** Populate slot 0 with a single valid ingredient row and matching mix total */
    function populateMainRecipe() {
      const row = recipeContext.recipes[0].ingredientRows[0];
      row.name = "Whole Milk";
      row.ingredient = stubIngredient("Whole Milk");
      row.quantity = 1000;
      recipeContext.recipes[0].mixTotal = 1000;
    }

    it("always shows evaporation input", () => {
      render(<RecipeEditorWithSpy />);
      expect(screen.getByTestId("recipe-evaporation-grams")).toBeInTheDocument();
    });

    it("stores grams entered in the Evap. field and shows the resulting yield", async () => {
      const user = userEvent.setup();
      populateMainRecipe();
      render(<RecipeEditorWithSpy />);

      await user.type(screen.getByTestId("recipe-evaporation-grams"), "150");
      await waitFor(() => {
        expect(recipeContext.recipes[0].evaporation).toBe(150);
        // Yield readout beside the input: 1000 g − 150 g = 850 g
        expect(screen.getByTitle(/Yield/)).toHaveTextContent("850");
      });
    });

    it("does not show the yield readout until evaporation is set", () => {
      populateMainRecipe();
      render(<RecipeEditorWithSpy />);
      expect(screen.queryByTitle(/Yield/)).not.toBeInTheDocument();

      cleanup();
      recipeContext.recipes[0].evaporation = 100;
      render(<RecipeEditorWithSpy />);
      expect(screen.getByTitle(/Yield/)).toHaveTextContent("900");
    });

    it("disables the de-evaporate button when there is no evaporation", () => {
      populateMainRecipe();
      render(<RecipeEditorWithSpy />);
      expect(screen.getByTitle("No evaporation to remove")).toBeDisabled();
    });

    it("flags the input and shows the sci-cream message when evaporation exceeds available water", async () => {
      const user = userEvent.setup();
      populateMainRecipe(); // 1000 g Whole Milk (~880 g water)
      render(<RecipeEditorWithSpy />);

      const input = screen.getByTestId("recipe-evaporation-grams");
      await user.type(input, "950");
      await waitFor(() => {
        expect(recipeContext.recipes[0].mixError).toBeDefined();
        expect(input).toHaveAttribute("aria-invalid", "true");
      });
      // The tooltip surfaces the crate's error text, not the default caption.
      expect(screen.getByTitle(/invalid evaporation/i)).toBeInTheDocument();
    });

    it("de-evaporates the recipe and clears its evaporation", async () => {
      const user = userEvent.setup();
      populateMainRecipe();
      recipeContext.recipes[0].evaporation = 100;
      render(<RecipeEditorWithSpy />);

      const button = screen.getByTitle(/Reformulate as an equivalent recipe/);
      expect(button).not.toBeDisabled();

      await user.click(button);
      await waitFor(() => {
        expect(recipeContext.recipes[0].evaporation).toBe(0);
      });
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

    it("shows the version name from the saved-recipes cache when the version is named", () => {
      recipeContext.recipes[0].name = "Loaded Recipe";
      recipeContext.recipes[0].savedRef = { recipeId: 7, versionNumber: 3 };
      mockSessionResources([
        {
          id: 7,
          name: "Loaded Recipe",
          versions: [{ version: 3, recipe: [], versionName: "3.1", createdAt: "" }],
        },
      ]);
      render(<RecipeEditor {...makeRecipeEditorProps([0])} />);
      expect(screen.getByTitle("Editing version 3.1")).toBeInTheDocument();
      expect(screen.getByTestId("version-badge-v3.1")).toBeInTheDocument();
    });

    it("falls back to the integer when the cache has no name for the version", () => {
      recipeContext.recipes[0].name = "Loaded Recipe";
      recipeContext.recipes[0].savedRef = { recipeId: 7, versionNumber: 3 };
      render(<RecipeEditor {...makeRecipeEditorProps([0])} />);
      expect(screen.getByTitle("Editing version 3")).toBeInTheDocument();
    });
  });

  describe("Save as named version", () => {
    it("shows the next version name as the new-version input's placeholder", () => {
      mockSignedIn();
      populateRecipe("My Recipe");
      recipeContext.recipes[0].savedRef = { recipeId: 7, versionNumber: 2 };
      mockSessionResources([
        {
          id: 7,
          name: "My Recipe",
          versions: [
            { version: 1, recipe: [], versionName: "3.1", createdAt: "" },
            { version: 2, recipe: [], versionName: "3.2", createdAt: "" },
          ],
        },
      ]);
      render(<RecipeEditor {...makeRecipeEditorProps([0])} />);

      // Next default continues the visible sequence: max major (3) + 1 = "4"
      expect(screen.getByLabelText("New version")).toHaveAttribute("placeholder", "4");
    });

    it("disables the branch button on an invalid version name", () => {
      mockSignedIn();
      populateRecipe("My Recipe");
      recipeContext.recipes[0].savedRef = { recipeId: 7, versionNumber: 1 };
      render(<RecipeEditor {...makeRecipeEditorProps([0])} />);

      fireEvent.change(screen.getByLabelText("New version"), { target: { value: "not valid" } });
      expect(screen.getByRole("button", { name: "Save as new version" })).toBeDisabled();
    });

    it("passes the entered name to createUserRecipeVersion", async () => {
      mockSignedIn();
      populateRecipe("My Recipe");
      recipeContext.recipes[0].savedRef = { recipeId: 7, versionNumber: 1 };
      recipeContext.recipes[0].baseline = { name: "My Recipe", serializedRows: "" };
      render(<RecipeEditor {...makeRecipeEditorProps([0])} />);

      fireEvent.change(screen.getByLabelText("New version"), { target: { value: "3.1" } });
      fireEvent.click(screen.getByRole("button", { name: "Save as new version" }));
      await waitFor(() => {
        expect(createUserRecipeVersion).toHaveBeenCalledWith("a@b.c", 7, [["Whole Milk", 500]], {
          versionName: "3.1",
        });
      });
    });

    it("on a reference slot, keeps the badge but hides the input and disables the branch button", () => {
      mockSignedIn();
      // A saved recipe loaded into Ref A (slot 1): its version still shows, but it can't be
      // branched, so the new-version input is hidden and the always-shown branch button is disabled.
      recipeContext.recipes[1].name = "Ref Recipe";
      recipeContext.recipes[1].ingredientRows[0].name = "Whole Milk";
      recipeContext.recipes[1].ingredientRows[0].quantity = 500;
      recipeContext.recipes[1].mixTotal = 500;
      recipeContext.recipes[1].savedRef = { recipeId: 7, versionNumber: 3 };
      render(<RecipeEditor {...makeRecipeEditorProps([0, 1])} urlSlot={1} />);

      expect(screen.getByTitle("Editing version 3")).toBeInTheDocument();
      expect(screen.queryByLabelText("New version")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save as new version" })).toBeDisabled();
    });
  });
});
