import "@testing-library/jest-dom/vitest";

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { FileIntro } from "@/app/_elements/file-intro";

const INTRO = { title: "Chocolates", text: "Notes on **every** entry." };

describe("FileIntro", () => {
  afterEach(cleanup);

  it("names its file in a disclosure that starts collapsed", () => {
    render(<FileIntro intro={INTRO} />);
    const summary = screen.getByText("About Chocolates");
    expect(summary.tagName).toBe("SUMMARY");
    expect(summary.closest("details")).not.toHaveAttribute("open");
  });

  it("renders the intro as markdown inside the disclosure", () => {
    render(<FileIntro intro={INTRO} />);
    const strong = screen.getByText("every");
    expect(strong.tagName).toBe("STRONG");
    expect(strong.closest("details")).not.toBeNull();
  });
});
