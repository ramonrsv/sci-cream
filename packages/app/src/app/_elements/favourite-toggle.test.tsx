import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

import { FavouriteToggle } from "./favourite-toggle";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("FavouriteToggle", () => {
  it("reports the unstarred state through aria-pressed", () => {
    render(<FavouriteToggle favourite={false} onChange={vi.fn()} />);
    expect(screen.getByTestId("favourite-toggle")).toHaveAttribute("aria-pressed", "false");
  });

  it("reports the starred state through aria-pressed", () => {
    render(<FavouriteToggle favourite onChange={vi.fn()} />);
    expect(screen.getByTestId("favourite-toggle")).toHaveAttribute("aria-pressed", "true");
  });

  it("asks to star when currently unstarred", () => {
    const onChange = vi.fn();
    render(<FavouriteToggle favourite={false} onChange={onChange} />);
    fireEvent.click(screen.getByTestId("favourite-toggle"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("asks to unstar when currently starred", () => {
    const onChange = vi.fn();
    render(<FavouriteToggle favourite onChange={onChange} />);
    fireEvent.click(screen.getByTestId("favourite-toggle"));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("names the entity being starred in its title", () => {
    render(<FavouriteToggle favourite={false} onChange={vi.fn()} label="batch" />);
    expect(screen.getByTestId("favourite-toggle")).toHaveAttribute(
      "title",
      "Add batch to favourites",
    );
  });

  it("offers to remove once starred", () => {
    render(<FavouriteToggle favourite onChange={vi.fn()} label="recipe" />);
    expect(screen.getByTestId("favourite-toggle")).toHaveAttribute(
      "title",
      "Remove recipe from favourites",
    );
  });

  it("fills the star when starred, so the state does not rest on color alone", () => {
    const { container } = render(<FavouriteToggle favourite onChange={vi.fn()} />);
    expect(container.querySelector("svg")).toHaveAttribute("fill", "currentColor");
  });

  it("leaves the star unfilled when not starred", () => {
    const { container } = render(<FavouriteToggle favourite={false} onChange={vi.fn()} />);
    expect(container.querySelector("svg")).not.toHaveAttribute("fill", "currentColor");
  });
});
