import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

import { RATING_LABELS, Rating } from "@/lib/rating";
import { RatingToggle } from "./rating-toggle";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Open the choice popup and wait for it, since the three ratings only exist once it is up. */
async function openChoices() {
  fireEvent.click(screen.getByTestId("rating-trigger"));
  await screen.findByTestId("rating-good");
}

describe("RatingToggle", () => {
  it("keeps the choices closed until the trigger is clicked", () => {
    render(<RatingToggle onChange={vi.fn()} />);
    expect(screen.queryByTestId("rating-good")).not.toBeInTheDocument();
  });

  it("offers one button per rating", async () => {
    render(<RatingToggle onChange={vi.fn()} />);
    await openChoices();
    expect(screen.getByTestId("rating-bad")).toBeInTheDocument();
    expect(screen.getByTestId("rating-good")).toBeInTheDocument();
    expect(screen.getByTestId("rating-great")).toBeInTheDocument();
  });

  it("marks nothing as pressed when unrated", async () => {
    render(<RatingToggle onChange={vi.fn()} />);
    await openChoices();
    for (const id of ["rating-bad", "rating-good", "rating-great"]) {
      expect(screen.getByTestId(id)).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("marks only the current rating as pressed", async () => {
    render(<RatingToggle rating={Rating.Good} onChange={vi.fn()} />);
    await openChoices();
    expect(screen.getByTestId("rating-good")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("rating-bad")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("rating-great")).toHaveAttribute("aria-pressed", "false");
  });

  it.each([
    ["rating-bad", Rating.Bad],
    ["rating-good", Rating.Good],
    ["rating-great", Rating.Great],
  ])("sets the rating when %s is chosen while unrated", async (testId, expected) => {
    const onChange = vi.fn();
    render(<RatingToggle onChange={onChange} />);
    await openChoices();
    fireEvent.click(screen.getByTestId(testId));
    expect(onChange).toHaveBeenCalledWith(expected);
  });

  it("clears the rating when the active choice is chosen again", async () => {
    const onChange = vi.fn();
    render(<RatingToggle rating={Rating.Great} onChange={onChange} />);
    await openChoices();
    fireEvent.click(screen.getByTestId("rating-great"));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("switches rather than clears when a different choice is made", async () => {
    const onChange = vi.fn();
    render(<RatingToggle rating={Rating.Great} onChange={onChange} />);
    await openChoices();
    fireEvent.click(screen.getByTestId("rating-bad"));
    expect(onChange).toHaveBeenCalledWith(Rating.Bad);
  });

  it("closes the popup once a choice is made", async () => {
    render(<RatingToggle onChange={vi.fn()} />);
    await openChoices();
    fireEvent.click(screen.getByTestId("rating-good"));
    await waitFor(() => {
      expect(screen.queryByTestId("rating-good")).not.toBeInTheDocument();
    });
  });

  it("exposes the current rating by name, for tests and styling", () => {
    render(<RatingToggle rating={Rating.Bad} onChange={vi.fn()} />);
    expect(screen.getByTestId("rating-toggle")).toHaveAttribute("data-rating", "Bad");
  });

  it("reports 'none' rather than an empty attribute when unrated", () => {
    render(<RatingToggle onChange={vi.fn()} />);
    expect(screen.getByTestId("rating-toggle")).toHaveAttribute("data-rating", "none");
  });

  it("says the active choice will clear, so the second click is not a surprise", async () => {
    render(<RatingToggle rating={Rating.Good} onChange={vi.fn()} />);
    await openChoices();
    expect(screen.getByTestId("rating-good").getAttribute("title")).toContain("click to clear");
    expect(screen.getByTestId("rating-bad").getAttribute("title")).not.toContain("click to clear");
  });

  it("draws each rating its own icon, twinning the text glyphs", async () => {
    render(<RatingToggle onChange={vi.fn()} />);
    await openChoices();
    expect(screen.getByTestId("rating-bad").querySelector("svg")).toHaveClass("lucide-thumbs-down");
    expect(screen.getByTestId("rating-good").querySelector("svg")).toHaveClass("lucide-thumbs-up");
    expect(screen.getByTestId("rating-great").querySelector("svg")).toHaveClass("lucide-trophy");
  });

  it("offers a hollow single thumb as the trigger while unrated", () => {
    render(<RatingToggle onChange={vi.fn()} />);
    const icons = screen.getByTestId("rating-trigger").querySelectorAll("svg");
    expect(icons).toHaveLength(1);
    expect(icons[0]).toHaveAttribute("fill", "none");
  });

  it("wears the current rating on the trigger, filled", () => {
    render(<RatingToggle rating={Rating.Great} onChange={vi.fn()} />);
    const icon = screen.getByTestId("rating-trigger").querySelector("svg");
    expect(icon).toHaveClass("lucide-trophy");
    expect(icon).toHaveAttribute("fill", "currentColor");
  });

  it("names the trigger for what it does, rated or not", () => {
    const { rerender } = render(<RatingToggle onChange={vi.fn()} />);
    expect(screen.getByTestId("rating-trigger")).toHaveAttribute("aria-label", "Rate this version");

    rerender(<RatingToggle rating={Rating.Bad} onChange={vi.fn()} />);
    expect(screen.getByTestId("rating-trigger").getAttribute("aria-label")).toContain(
      RATING_LABELS[Rating.Bad],
    );
  });
});
