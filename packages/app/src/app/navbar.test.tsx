import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { STORAGE_KEYS } from "@/lib/local-storage";
import { onLayoutReset, saveLayouts } from "@/lib/calculator-layout";

// ---------------------------------------------------------------------------
// Test helpers, mocks, and setup
// ---------------------------------------------------------------------------

let mockPathname = "/";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn().mockReturnValue({ data: null, status: "unauthenticated" }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => mockPathname }));

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- Simplify testing by using img tag
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const { Navbar } = await import("./navbar");

/** Build a `ResponsiveLayouts`-ish payload that's valid enough to round-trip through storage */
function sampleStoredLayouts() {
  return { lg: [{ i: "recipe", x: 0, y: 0, w: 4, h: 4 }] } as unknown as Parameters<
    typeof saveLayouts
  >[0];
}

// ---------------------------------------------------------------------------
// Reset layout button
// ---------------------------------------------------------------------------

describe("Header — reset layout button", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockPathname = "/";
  });

  afterEach(() => {
    cleanup();
  });

  it("does not render the reset button on non-calculator routes", async () => {
    mockPathname = "/recipes";

    render(
      <Navbar>
        <div />
      </Navbar>,
    );

    // Wait for the navbar to mount (renders an empty header until `mounted` is set)
    await screen.findByRole("button", { name: /collapse sidebar/i });
    expect(screen.queryByRole("button", { name: /reset calculator layout/i })).toBeNull();
  });

  it("renders the reset button on the /calculator route", async () => {
    mockPathname = "/calculator";

    render(
      <Navbar>
        <div />
      </Navbar>,
    );

    expect(
      await screen.findByRole("button", { name: /reset calculator layout/i }),
    ).toBeInTheDocument();
  });

  it("clears stored layouts and notifies subscribers when the user confirms", async () => {
    mockPathname = "/calculator";
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const resetHandler = vi.fn();
    const unsubscribe = onLayoutReset(resetHandler);

    // Seed storage so we can verify it gets cleared
    saveLayouts(sampleStoredLayouts());
    expect(localStorage.getItem(STORAGE_KEYS.calculatorLayouts)).not.toBeNull();

    render(
      <Navbar>
        <div />
      </Navbar>,
    );
    const button = await screen.findByRole("button", { name: /reset calculator layout/i });
    await user.click(button);

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(localStorage.getItem(STORAGE_KEYS.calculatorLayouts)).toBeNull();
    await waitFor(() => expect(resetHandler).toHaveBeenCalledOnce());

    unsubscribe();
    confirmSpy.mockRestore();
  });

  it("leaves storage intact and does not notify subscribers when the user cancels", async () => {
    mockPathname = "/calculator";
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const resetHandler = vi.fn();
    const unsubscribe = onLayoutReset(resetHandler);

    saveLayouts(sampleStoredLayouts());
    const before = localStorage.getItem(STORAGE_KEYS.calculatorLayouts);

    render(
      <Navbar>
        <div />
      </Navbar>,
    );
    const button = await screen.findByRole("button", { name: /reset calculator layout/i });
    await user.click(button);

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(localStorage.getItem(STORAGE_KEYS.calculatorLayouts)).toBe(before);
    expect(resetHandler).not.toHaveBeenCalled();

    unsubscribe();
    confirmSpy.mockRestore();
  });
});
