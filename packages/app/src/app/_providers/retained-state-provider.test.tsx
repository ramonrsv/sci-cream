import "@testing-library/jest-dom/vitest";

import { describe, it, expect, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { useRetainedState } from "@/lib/hooks/use-retained-state";
import { renderWithRetainedState } from "@/__tests__/unit/retained-state";

import { RetainedStateProvider } from "./retained-state-provider";

/** Text input whose value is retained, standing in for a page that unmounts on navigation. */
function Probe() {
  const [value, setValue] = useRetainedState<string>("probe", "");
  return <input aria-label="probe" value={value} onChange={(e) => setValue(e.target.value)} />;
}

describe("RetainedStateProvider", () => {
  afterEach(cleanup);

  it("renders its children", () => {
    render(
      <RetainedStateProvider>
        <p>hello</p>
      </RetainedStateProvider>,
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("retains a consumer's value across its unmount and remount", () => {
    const { leaveAndReturn } = renderWithRetainedState(<Probe />);
    fireEvent.change(screen.getByLabelText("probe"), { target: { value: "kept" } });

    leaveAndReturn();

    expect(screen.getByLabelText("probe")).toHaveValue("kept");
  });

  it("starts empty for a new provider, as after a reload", () => {
    const first = renderWithRetainedState(<Probe />);
    fireEvent.change(screen.getByLabelText("probe"), { target: { value: "gone" } });
    first.unmount();

    renderWithRetainedState(<Probe />);

    expect(screen.getByLabelText("probe")).toHaveValue("");
  });
});
