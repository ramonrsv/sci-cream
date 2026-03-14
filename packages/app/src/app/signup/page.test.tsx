import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- Simplify testing by using img tag
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const { default: SignUpPage } = await import("./page");

describe("SignUpPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  it("renders all form fields", () => {
    render(<SignUpPage />);
    expect(screen.getByPlaceholderText("Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password (min. 8 characters)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Confirm password")).toBeInTheDocument();
  });

  it("renders a link to the sign-in page", () => {
    render(<SignUpPage />);
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/signin");
  });

  // ---------------------------------------------------------------------------
  // Client-side validation
  // ---------------------------------------------------------------------------

  it("shows an error and does not fetch when passwords do not match", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    render(<SignUpPage />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("Name"), "Alice");
    await user.type(screen.getByPlaceholderText("Email"), "alice@example.com");
    await user.type(screen.getByPlaceholderText("Password (min. 8 characters)"), "password123");
    await user.type(screen.getByPlaceholderText("Confirm password"), "different999");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("clears a previous error when the form is resubmitted", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) } as Response);

    render(<SignUpPage />);
    const user = userEvent.setup();

    // Trigger mismatch error first
    await user.type(screen.getByPlaceholderText("Name"), "Alice");
    await user.type(screen.getByPlaceholderText("Email"), "alice@example.com");
    await user.type(screen.getByPlaceholderText("Password (min. 8 characters)"), "password123");
    await user.type(screen.getByPlaceholderText("Confirm password"), "different999");
    await user.click(screen.getByRole("button", { name: /sign up/i }));
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();

    // Fix the confirm field and resubmit
    await user.clear(screen.getByPlaceholderText("Confirm password"));
    await user.type(screen.getByPlaceholderText("Confirm password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument();
      expect(fetchSpy).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // API interaction
  // ---------------------------------------------------------------------------

  it("calls /api/auth/signup with name, email, and password on submit", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) } as Response);

    render(<SignUpPage />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("Name"), "Alice");
    await user.type(screen.getByPlaceholderText("Email"), "alice@example.com");
    await user.type(screen.getByPlaceholderText("Password (min. 8 characters)"), "password123");
    await user.type(screen.getByPlaceholderText("Confirm password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    const [url, options] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("/api/auth/signup");
    expect(options?.method).toBe("POST");
    const sentBody = JSON.parse(options?.body as string);
    expect(sentBody).toEqual({
      name: "Alice",
      email: "alice@example.com",
      password: "password123",
    });
  });

  it("shows the API error message on failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "An account with this email already exists." }),
    } as Response);

    render(<SignUpPage />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("Name"), "Alice");
    await user.type(screen.getByPlaceholderText("Email"), "alice@example.com");
    await user.type(screen.getByPlaceholderText("Password (min. 8 characters)"), "password123");
    await user.type(screen.getByPlaceholderText("Confirm password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });
  });

  it("shows a fallback error message when the API response has no error field", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    } as Response);

    render(<SignUpPage />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("Name"), "Alice");
    await user.type(screen.getByPlaceholderText("Email"), "alice@example.com");
    await user.type(screen.getByPlaceholderText("Password (min. 8 characters)"), "password123");
    await user.type(screen.getByPlaceholderText("Confirm password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it("redirects to /signin?registered=true on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response);

    render(<SignUpPage />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("Name"), "Alice");
    await user.type(screen.getByPlaceholderText("Email"), "alice@example.com");
    await user.type(screen.getByPlaceholderText("Password (min. 8 characters)"), "password123");
    await user.type(screen.getByPlaceholderText("Confirm password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/signin?registered=true");
    });
  });

  it("shows a loading state while the request is in flight", async () => {
    let resolvePromise!: () => void;
    vi.spyOn(globalThis, "fetch").mockReturnValue(
      new Promise<Response>((resolve) => {
        resolvePromise = () =>
          resolve({ ok: true, json: () => Promise.resolve({ success: true }) } as Response);
      }),
    );

    render(<SignUpPage />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("Name"), "Alice");
    await user.type(screen.getByPlaceholderText("Email"), "alice@example.com");
    await user.type(screen.getByPlaceholderText("Password (min. 8 characters)"), "password123");
    await user.type(screen.getByPlaceholderText("Confirm password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(await screen.findByText(/creating account/i)).toBeInTheDocument();
    resolvePromise();
  });
});
