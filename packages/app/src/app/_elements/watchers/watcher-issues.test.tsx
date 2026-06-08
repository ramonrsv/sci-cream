import "@testing-library/jest-dom/vitest";

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

import { WatcherIssues } from "@/app/_elements/watchers/watcher-issues";

import { BalancingIssueView, CompKey, compToPropKey } from "@workspace/sci-cream";

const MILK_FAT = compToPropKey(CompKey.MilkFat);

const errorIssue: BalancingIssueView = {
  severity: "error",
  keys: [MILK_FAT],
  message: "Milk Fat target -2 is negative",
};

const warningIssue: BalancingIssueView = {
  severity: "warning",
  keys: [MILK_FAT],
  message: "Milk Fat target 99 is outside the reachable range [0, 40]",
};

describe("WatcherIssues", () => {
  afterEach(() => cleanup());

  it("renders a compact summary chip with per-severity counts, closed by default", () => {
    render(<WatcherIssues issues={[errorIssue, warningIssue]} />);
    const toggle = screen.getByTestId("watcher-issues-toggle");
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAccessibleName(/1 error, 1 warning/);
    // The detail popover is not mounted until the chip is clicked.
    expect(screen.queryByTestId("watcher-issues-popup")).not.toBeInTheDocument();
  });

  it("opens a popover listing messages, errors first, on click", () => {
    render(<WatcherIssues issues={[errorIssue, warningIssue]} />);
    fireEvent.click(screen.getByTestId("watcher-issues-toggle"));

    expect(screen.getByTestId("watcher-issues-popup")).toBeInTheDocument();
    const lines = screen.getAllByTestId("watcher-issue");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toHaveAttribute("data-severity", "error");
    expect(lines[0]).toHaveTextContent(errorIssue.message);
    expect(lines[1]).toHaveAttribute("data-severity", "warning");
    expect(lines[1]).toHaveTextContent(warningIssue.message);
  });

  it("toggles the popover closed on a second click", () => {
    render(<WatcherIssues issues={[warningIssue]} />);
    const toggle = screen.getByTestId("watcher-issues-toggle");

    fireEvent.click(toggle);
    expect(screen.getByTestId("watcher-issues-popup")).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.queryByTestId("watcher-issues-popup")).not.toBeInTheDocument();
  });

  it("counts extraError toward the error total and lists it as an error line", () => {
    render(<WatcherIssues issues={[]} extraError="infeasible" />);
    const toggle = screen.getByTestId("watcher-issues-toggle");
    expect(toggle).toHaveAccessibleName(/1 error/);

    fireEvent.click(toggle);
    const lines = screen.getAllByTestId("watcher-issue");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toHaveTextContent("infeasible");
    expect(lines[0]).toHaveAttribute("data-severity", "error");
  });
});
