import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
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

    // Wait for the navbar to mount (renders an empty header until `mounted` is set).
    // The default collapsed state titles the toggle "Expand sidebar".
    await screen.findByRole("button", { name: /expand sidebar/i });
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

// ---------------------------------------------------------------------------
// Sidebar collapse / expand / peek
// ---------------------------------------------------------------------------

/** Stub `matchMedia` so `useIsDesktop` resolves to desktop; without it the mobile branch renders. */
function stubDesktopViewport() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi
      .fn()
      .mockReturnValue({
        matches: true,
        media: "",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
  });
}

describe("Header / Sidebar — collapse and peek", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockPathname = "/";
  });

  afterEach(() => {
    cleanup();
    // jsdom has no matchMedia; drop any desktop stub so the next test defaults to mobile.
    Reflect.deleteProperty(window, "matchMedia");
  });

  it("starts collapsed with the sidebar hidden and a hamburger on mobile", async () => {
    render(
      <Navbar>
        <div />
      </Navbar>,
    );

    expect(await screen.findByRole("button", { name: "Peek sidebar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
    expect(screen.getByRole("complementary")).toHaveClass("w-0");
  });

  it("the toggle expands the sidebar to the rail and persists the state", async () => {
    const user = userEvent.setup();
    render(
      <Navbar>
        <div />
      </Navbar>,
    );

    await user.click(await screen.findByRole("button", { name: "Expand sidebar" }));

    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeInTheDocument();
    expect(screen.getByRole("complementary")).toHaveClass("w-14");
    expect(localStorage.getItem(STORAGE_KEYS.sidebarCollapsed)).toBe("false");
  });

  it("the hamburger opens the peek drawer", async () => {
    const user = userEvent.setup();
    render(
      <Navbar>
        <div />
      </Navbar>,
    );

    await user.click(await screen.findByRole("button", { name: "Peek sidebar" }));

    expect(screen.getByRole("complementary")).toHaveClass("w-54");
    expect(screen.getByRole("button", { name: "Un-peek sidebar" })).toBeInTheDocument();
  });

  it("a pointer down outside the sidebar and header dismisses the peek", async () => {
    const user = userEvent.setup();
    render(
      <Navbar>
        <div data-testid="content" />
      </Navbar>,
    );

    await user.click(await screen.findByRole("button", { name: "Peek sidebar" }));
    expect(screen.getByRole("complementary")).toHaveClass("w-54");

    fireEvent.pointerDown(screen.getByTestId("content"));

    expect(screen.getByRole("complementary")).toHaveClass("w-0");
  });

  it("dismisses the peek drawer when navigating on mobile", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Navbar>
        <div />
      </Navbar>,
    );

    await user.click(await screen.findByRole("button", { name: "Peek sidebar" }));
    expect(screen.getByRole("complementary")).toHaveClass("w-54");

    // Navigating resets the tapped peek so the drawer doesn't linger over the new page.
    mockPathname = "/recipes";
    rerender(
      <Navbar>
        <div />
      </Navbar>,
    );

    expect(screen.getByRole("complementary")).toHaveClass("w-0");
  });

  it("keeps the peek drawer open when navigating on desktop", async () => {
    stubDesktopViewport();
    const { rerender } = render(
      <Navbar>
        <div />
      </Navbar>,
    );

    // Wait for the desktop layout (logo, not hamburger) to resolve, then hover to peek.
    await screen.findByAltText("Sci-Cream");
    const sidebar = screen.getByRole("complementary");
    fireEvent.mouseEnter(sidebar);
    expect(sidebar).toHaveClass("w-54");

    // Desktop peek follows hover, so a navigation leaves the drawer open.
    mockPathname = "/recipes";
    rerender(
      <Navbar>
        <div />
      </Navbar>,
    );

    expect(screen.getByRole("complementary")).toHaveClass("w-54");
  });

  it("renders the logo and hover-opens the drawer on desktop", async () => {
    stubDesktopViewport();
    render(
      <Navbar>
        <div />
      </Navbar>,
    );

    // Desktop shows the logo, not the hamburger.
    expect(await screen.findByAltText("Sci-Cream")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Peek sidebar" })).toBeNull();

    const sidebar = screen.getByRole("complementary");
    expect(sidebar).toHaveClass("w-0");

    fireEvent.mouseEnter(sidebar);
    expect(sidebar).toHaveClass("w-54");
  });
});
