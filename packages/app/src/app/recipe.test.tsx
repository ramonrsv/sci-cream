import "@testing-library/jest-dom/vitest";

import { setupVitestCanvasMock } from "vitest-canvas-mock";
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { render, screen, cleanup, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { type SetStateAction, useState } from "react";

import { MAX_RECIPES, RECIPE_TOTAL_ROWS } from "./page";
import {
  RecipeGrid,
  makeEmptyRecipeContext,
  isRecipeEmpty,
  calculateMixTotal,
  makeSciCreamRecipe,
  type Recipe,
  type RecipeContext,
} from "./recipe";

import { fetchIngredientSpec } from "../lib/data";

import {
  Category,
  Ingredient,
  into_ingredient_from_spec,
  Composition,
  MixProperties,
  RecipeLine,
} from "@workspace/sci-cream";

import { SchemaCategory } from "@workspace/sci-cream/schema-category";

vi.mock("../lib/data", () => ({
  fetchValidIngredientNames: vi.fn(),
  fetchIngredientSpec: vi.fn(() => Promise.resolve(undefined)),
  fetchAllIngredientSpecs: vi.fn(() => Promise.resolve([])),
}));

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

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

describe("Recipe Helper Functions", () => {
  describe("makeEmptyRecipeContext", () => {
    it("should create a context with correct number of recipes", () => {
      const context = makeEmptyRecipeContext();
      expect(context.recipes).toHaveLength(MAX_RECIPES);
    });

    it("should create recipes with correct number of ingredient rows", () => {
      const context = makeEmptyRecipeContext();
      context.recipes.forEach((recipe) => {
        expect(recipe.ingredientRows).toHaveLength(RECIPE_TOTAL_ROWS);
      });
    });

    it("should name first recipe 'Recipe' and others 'Ref N'", () => {
      const context = makeEmptyRecipeContext();
      expect(context.recipes[0].name).toBe("Recipe");
      expect(context.recipes[1].name).toBe("Ref 1");
      expect(context.recipes[2].name).toBe("Ref 2");
    });

    it("should initialize ingredient rows with correct indices", () => {
      const context = makeEmptyRecipeContext();
      context.recipes[0].ingredientRows.forEach((row, idx) => {
        expect(row.index).toBe(idx);
        expect(row.name).toBe("");
        expect(row.quantity).toBeUndefined();
        expect(row.ingredient).toBeUndefined();
      });
    });

    it("should initialize with empty cache and valid ingredients list", () => {
      const context = makeEmptyRecipeContext();
      expect(context.ingredientCache.size).toBe(0);
      expect(context.validIngredients).toEqual([]);
    });

    it("should initialize mix properties for each recipe", () => {
      const context = makeEmptyRecipeContext();
      context.recipes.forEach((recipe) => {
        expect(recipe.mixProperties).toBeInstanceOf(MixProperties);
      });
    });
  });

  describe("isRecipeEmpty", () => {
    let recipe: Recipe;

    beforeEach(() => {
      recipe = makeEmptyRecipeContext().recipes[0];
    });

    it("should return true when mixTotal is undefined", () => {
      recipe.mixTotal = undefined;
      expect(isRecipeEmpty(recipe)).toBe(true);
    });

    it("should return true when mixTotal is 0", () => {
      recipe.mixTotal = 0;
      expect(isRecipeEmpty(recipe)).toBe(true);
    });

    it("should return false when mixTotal is positive", () => {
      recipe.mixTotal = 100;
      expect(isRecipeEmpty(recipe)).toBe(false);
    });

    it("should return false when mixTotal is negative (edge case)", () => {
      recipe.mixTotal = -1;
      expect(isRecipeEmpty(recipe)).toBe(false);
    });
  });

  describe("calculateMixTotal", () => {
    let recipe: Recipe;

    beforeEach(() => {
      recipe = makeEmptyRecipeContext().recipes[0];
    });

    it("should return undefined when all quantities are undefined", () => {
      expect(calculateMixTotal(recipe)).toBeUndefined();
    });

    it("should sum all defined quantities", () => {
      recipe.ingredientRows[0].quantity = 50;
      recipe.ingredientRows[1].quantity = 30;
      recipe.ingredientRows[2].quantity = 20;
      expect(calculateMixTotal(recipe)).toBe(100);
    });

    it("should treat undefined quantities as 0 when at least one is defined", () => {
      recipe.ingredientRows[0].quantity = 50;
      recipe.ingredientRows[1].quantity = undefined;
      recipe.ingredientRows[2].quantity = 30;
      expect(calculateMixTotal(recipe)).toBe(80);
    });

    it("should handle decimal quantities", () => {
      recipe.ingredientRows[0].quantity = 33.33;
      recipe.ingredientRows[1].quantity = 66.67;
      expect(calculateMixTotal(recipe)).toBeCloseTo(100, 2);
    });

    it("should handle zero quantities", () => {
      recipe.ingredientRows[0].quantity = 0;
      recipe.ingredientRows[1].quantity = 100;
      expect(calculateMixTotal(recipe)).toBe(100);
    });
  });

  describe("makeSciCreamRecipe", () => {
    let recipe: Recipe;

    beforeEach(() => {
      recipe = makeEmptyRecipeContext().recipes[0];
    });

    it("should create SciCreamRecipe with correct name", () => {
      recipe.name = "Test Recipe";
      const sciCreamRecipe = makeSciCreamRecipe(recipe);
      expect(sciCreamRecipe.name).toBe("Test Recipe");
    });

    it("should return empty recipe lines when no ingredients have both ingredient and quantity", () => {
      expect(makeSciCreamRecipe(recipe).lines.length).toEqual(0);
    });

    it("should filter out rows without ingredient", () => {
      recipe.ingredientRows[0].quantity = 50;
      recipe.ingredientRows[0].ingredient = undefined;
      expect(makeSciCreamRecipe(recipe).lines.length).toEqual(0);
    });

    it("should filter out rows without quantity", () => {
      recipe.ingredientRows[0].ingredient = {
        name: "Test",
        composition: new Composition(),
      } as Ingredient;
      recipe.ingredientRows[0].quantity = undefined;
      expect(makeSciCreamRecipe(recipe).lines.length).toEqual(0);
    });

    it("should create RecipeLines for valid rows", () => {
      const comp1 = new Composition();
      const comp2 = new Composition();
      recipe.ingredientRows[0].ingredient = new Ingredient("Milk", Category.Dairy, comp1);
      recipe.ingredientRows[1].ingredient = new Ingredient("Sugar", Category.Sweetener, comp2);
      recipe.ingredientRows[0].quantity = 50;
      recipe.ingredientRows[1].quantity = 30;

      const lines = makeSciCreamRecipe(recipe).lines;
      expect(lines).toHaveLength(2);
      expect(lines[0]).toBeInstanceOf(RecipeLine);
      expect(lines[1]).toBeInstanceOf(RecipeLine);
      expect(lines[0].amount).toBe(50);
      expect(lines[1].amount).toBe(30);
    });
  });

  describe("SciCreamRecipe.calculate_composition_wasm", () => {
    let recipe: Recipe;

    beforeEach(() => {
      vi.clearAllMocks();
      recipe = makeEmptyRecipeContext().recipes[0];
    });

    it("should return a Composition object", () => {
      const result = makeSciCreamRecipe(recipe).calculate_composition_wasm();
      expect(result).toBeInstanceOf(Composition);
    });
  });

  describe("SciCreamRecipe.calculate_mix_properties_wasm", () => {
    let recipe: Recipe;

    beforeEach(() => {
      vi.clearAllMocks();
      recipe = makeEmptyRecipeContext().recipes[0];
    });

    it("should return a MixProperties object", () => {
      const result = makeSciCreamRecipe(recipe).calculate_mix_properties_wasm();
      expect(result).toBeInstanceOf(MixProperties);
    });
  });
});

describe("RecipeGrid Component", () => {
  let recipeContext: RecipeContext;
  let setRecipeContext: Mock<(value: SetStateAction<RecipeContext>) => void>;

  function RecipeGridWithSpy({ indices }: { indices: number[] }) {
    const [ctx, setCtx] = useState(recipeContext);

    React.useEffect(() => {
      setRecipeContext.mockImplementation((value: SetStateAction<RecipeContext>) => {
        setCtx(value);
        recipeContext = value instanceof Function ? value(recipeContext) : value;
      });
    }, []);

    return <RecipeGrid props={{ ctx: [ctx, setRecipeContext], indices }} />;
  }

  function getIngredientNameElement(container: HTMLElement, index: number) {
    return container.querySelector(
      `tbody tr:${index == 0 ? "first-child" : `nth-child(${index + 1})`} input[type="search"]`,
    ) as HTMLInputElement;
  }

  function getIngredientQuantityElement(container: HTMLElement, index: number) {
    return container.querySelector(
      `tbody tr:${index == 0 ? "first-child" : `nth-child(${index + 1})`} input[type="number"]`,
    ) as HTMLInputElement;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setupVitestCanvasMock();
    recipeContext = makeEmptyRecipeContext();
    recipeContext.validIngredients = ["2% Milk", "Sucrose", "Whipping Cream"];
    setRecipeContext = vi.fn();
    vi.mocked(fetchIngredientSpec).mockResolvedValue(undefined);
  });

  afterEach(async () => {
    cleanup();
    await vi.waitFor(() => {}, { timeout: 100 });
  });

  it("should render recipe selector", () => {
    const { container } = render(
      <RecipeGrid props={{ ctx: [recipeContext, setRecipeContext], indices: [0, 1] }} />,
    );

    const select = container.querySelector("select") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue("0");
    expect(within(select).getByText("Recipe")).toBeInTheDocument();
  });

  it("should render action buttons", () => {
    render(<RecipeGrid props={{ ctx: [recipeContext, setRecipeContext], indices: [0, 1] }} />);

    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /paste/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
  });

  it("should render table with correct number of ingredient rows", () => {
    const { container } = render(
      <RecipeGrid props={{ ctx: [recipeContext, setRecipeContext], indices: [0] }} />,
    );

    const tbody = container.querySelector("tbody");
    const rows = tbody?.querySelectorAll("tr");
    expect(rows).toHaveLength(RECIPE_TOTAL_ROWS);
  });

  it("should render table headers", () => {
    render(<RecipeGrid props={{ ctx: [recipeContext, setRecipeContext], indices: [0] }} />);

    expect(screen.getByText("Ingredient")).toBeInTheDocument();
    expect(screen.getByText("Qty (g)")).toBeInTheDocument();
    expect(screen.getByText("Qty (%)")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("should update ingredient name on input", async () => {
    const user = userEvent.setup();
    const { container } = render(<RecipeGridWithSpy indices={[0]} />);

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
    const { container } = render(<RecipeGridWithSpy indices={[0]} />);

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
    const { container } = render(<RecipeGridWithSpy indices={[0]} />);

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

  it("should display mix total when ingredients have quantities", () => {
    recipeContext.recipes[0].ingredientRows[0].quantity = 50;
    recipeContext.recipes[0].ingredientRows[1].quantity = 30;
    recipeContext.recipes[0].mixTotal = 80;

    render(<RecipeGridWithSpy indices={[0]} />);

    expect(screen.getByText("80")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument(); // 100%
  });

  it("should display percentage for each ingredient row", () => {
    recipeContext.recipes[0].ingredientRows[0].quantity = 50;
    recipeContext.recipes[0].ingredientRows[1].quantity = 30;
    recipeContext.recipes[0].mixTotal = 80;

    const { container } = render(
      <RecipeGrid props={{ ctx: [recipeContext, setRecipeContext], indices: [0] }} />,
    );

    const percentageCells = container.querySelectorAll("tbody td.comp-val");
    const firstRowPercent = percentageCells[0].textContent?.trim();
    const secondRowPercent = percentageCells[1].textContent?.trim();

    // 50/80 = 62.5%, 30/80 = 37.5%
    expect(firstRowPercent).toContain("62.5");
    expect(secondRowPercent).toContain("37.5");
  });

  it("should update and display mix total on input", async () => {
    const user = userEvent.setup();
    const { container } = render(<RecipeGridWithSpy indices={[0]} />);

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

  it("should change recipe when selector changes", async () => {
    recipeContext.recipes[0].ingredientRows[0].name = "Ingredient A";
    recipeContext.recipes[0].ingredientRows[0].quantity = 10;
    recipeContext.recipes[1].ingredientRows[0].name = "Ingredient B";
    recipeContext.recipes[1].ingredientRows[0].quantity = 20;

    const user = userEvent.setup();

    const { container } = render(<RecipeGridWithSpy indices={[0, 1]} />);

    function getFirstSearchInputElement() {
      return container.querySelector(
        `tbody tr:first-child input[type="search"]`,
      ) as HTMLInputElement;
    }

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
    expect(screen.queryByText("Ref 1")).toBeInTheDocument();
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

    render(<RecipeGridWithSpy indices={[0]} />);

    const copyButton = screen.getByRole("button", { name: /copy/i });
    await user.click(copyButton);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("Ingredient\tQty(g)\n2% Milk\t50\nSucrose\t30");
    });

    vi.unstubAllGlobals();
  });

  async function validatePaste(clipboardText: string) {
    const user = userEvent.setup();

    vi.stubGlobal("navigator", {
      clipboard: { readText: vi.fn(() => Promise.resolve(clipboardText)) },
    });

    render(<RecipeGridWithSpy indices={[0]} />);

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

    render(<RecipeGrid props={{ ctx: [recipeContext, setRecipeContext], indices: [0] }} />);

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

  it("should show red outline for invalid ingredient names", () => {
    recipeContext.recipes[0].ingredientRows[0].name = "Invalid Ingredient";

    const { container } = render(
      <RecipeGrid props={{ ctx: [recipeContext, setRecipeContext], indices: [0] }} />,
    );

    expect(getIngredientNameElement(container, 0).className).toContain("outline-red-400");
  });

  it("should show blue focus ring for valid ingredient names", () => {
    recipeContext.recipes[0].ingredientRows[0].name = "2% Milk";

    const { container } = render(
      <RecipeGrid props={{ ctx: [recipeContext, setRecipeContext], indices: [0] }} />,
    );

    const firstIngredientInput = getIngredientNameElement(container, 0);
    expect(firstIngredientInput.className).toContain("focus:ring-blue-400");
    expect(firstIngredientInput.className).not.toContain("outline-red-400");
  });

  it("should fetch ingredient spec when valid ingredient is entered", async () => {
    const mockSpec = { name: "2% Milk", user: 0, category: SchemaCategory.Dairy, spec: {} };
    vi.mocked(fetchIngredientSpec).mockResolvedValue(mockSpec);

    const { container } = render(<RecipeGridWithSpy indices={[0]} />);

    const firstIngredientInput = getIngredientNameElement(container, 0);
    fireEvent.change(firstIngredientInput, { target: { value: "2% Milk" } });

    await waitFor(() => {
      expect(fetchIngredientSpec).toHaveBeenCalledWith("2% Milk");
    });
  });

  const mockDairySpe = { DairySpec: { fat: 2 } };
  const mockSpec = { name: "2% Milk", user: 0, category: SchemaCategory.Dairy, spec: mockDairySpe };
  const mockIngredient = new Ingredient("2% Milk", Category.Dairy, new Composition());

  it("should make Ingredient from spec when valid ingredient is entered", async () => {
    vi.mocked(fetchIngredientSpec).mockResolvedValue(mockSpec);
    vi.mocked(into_ingredient_from_spec).mockReturnValue(mockIngredient);

    const { container } = render(<RecipeGridWithSpy indices={[0]} />);

    const firstIngredientInput = getIngredientNameElement(container, 0);
    fireEvent.change(firstIngredientInput, { target: { value: "2% Milk" } });

    await waitFor(() => {
      expect(into_ingredient_from_spec).toHaveBeenCalledWith(mockDairySpe);
      expect(recipeContext.recipes[0].ingredientRows[0].ingredient).toBe(mockIngredient);
    });
  });

  it("should cache fetched ingredient specs", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchIngredientSpec).mockResolvedValue(mockSpec);
    vi.mocked(into_ingredient_from_spec).mockReturnValue(mockIngredient);

    const { container } = render(<RecipeGridWithSpy indices={[0]} />);
    const firstIngredientInput = getIngredientNameElement(container, 0);

    await user.type(firstIngredientInput, "2% Milk");
    await waitFor(() => {
      expect(fetchIngredientSpec).toHaveBeenCalledWith("2% Milk");
      expect(recipeContext.ingredientCache.has("2% Milk")).toBe(true);
      expect(recipeContext.ingredientCache.get("2% Milk")).toBe(mockSpec);
    });

    await user.clear(firstIngredientInput);
    await waitFor(() => {}, { timeout: 100 });
    expect(recipeContext.ingredientCache.has("2% Milk")).toBe(true);

    await user.type(firstIngredientInput, "2% Milk");
    await waitFor(() => {}, { timeout: 100 });
    expect(fetchIngredientSpec).toHaveBeenCalledTimes(1);
    expect(recipeContext.ingredientCache.has("2% Milk")).toBe(true);
    expect(recipeContext.ingredientCache.get("2% Milk")).toBe(mockSpec);
  });

  it("should not fetch ingredient spec for empty string", async () => {
    const user = userEvent.setup();

    const { container } = render(
      <RecipeGrid props={{ ctx: [recipeContext, setRecipeContext], indices: [0] }} />,
    );

    const firstIngredientInput = getIngredientNameElement(container, 0);
    await user.clear(firstIngredientInput);

    await waitFor(() => {}, { timeout: 100 });
    expect(fetchIngredientSpec).not.toHaveBeenCalled();
  });

  it("should render datalist with valid ingredients", () => {
    const { container } = render(
      <RecipeGrid props={{ ctx: [recipeContext, setRecipeContext], indices: [0] }} />,
    );

    const datalist = container.querySelector("#valid-ingredients");
    expect(datalist).toBeInTheDocument();

    const options = datalist?.querySelectorAll("option");
    expect(options).toHaveLength(3);
    expect(options?.[0]).toHaveAttribute("value", "2% Milk");
    expect(options?.[1]).toHaveAttribute("value", "Sucrose");
    expect(options?.[2]).toHaveAttribute("value", "Whipping Cream");
  });

  it("should not set WASM object in context in a bad state", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchIngredientSpec).mockResolvedValue(mockSpec);
    vi.mocked(into_ingredient_from_spec).mockReturnValue(mockIngredient);

    const { container } = render(<RecipeGridWithSpy indices={[0]} />);

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
