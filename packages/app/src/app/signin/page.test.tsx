import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockSignIn = vi.fn();

// searchParams is module-level so individual tests can override it
let mockSearchParams = new URLSearchParams();

vi.mock("next-auth/react", () => ({ signIn: (...args: unknown[]) => mockSignIn(...args) }));

vi.mock("next/navigation", () => ({ useSearchParams: () => mockSearchParams }));

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- Simplify testing by using img tag
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const { default: SignInPage } = await import("./page");

describe("SignInPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  it("renders OAuth buttons for Google and GitHub", async () => {
    render(<SignInPage />);
    expect(await screen.findByText(/continue with google/i)).toBeInTheDocument();
    expect(await screen.findByText(/continue with github/i)).toBeInTheDocument();
  });

  it("renders email and password fields", async () => {
    render(<SignInPage />);
    expect(await screen.findByPlaceholderText("Email")).toBeInTheDocument();
    expect(await screen.findByPlaceholderText("Password")).toBeInTheDocument();
  });

  it("renders a sign-in with email button", async () => {
    render(<SignInPage />);
    expect(await screen.findByText(/sign in with email/i)).toBeInTheDocument();
  });

  it("renders a sign-up link", async () => {
    render(<SignInPage />);
    expect(await screen.findByRole("link", { name: /sign up/i })).toHaveAttribute(
      "href",
      "/signup",
    );
  });

  // ---------------------------------------------------------------------------
  // OAuth sign-in
  // ---------------------------------------------------------------------------

  it("calls signIn with 'google' when the Google button is clicked", async () => {
    render(<SignInPage />);
    const user = userEvent.setup();
    await user.click(await screen.findByText(/continue with google/i));
    expect(mockSignIn).toHaveBeenCalledWith("google", expect.any(Object));
  });

  it("calls signIn with 'github' when the GitHub button is clicked", async () => {
    render(<SignInPage />);
    const user = userEvent.setup();
    await user.click(await screen.findByText(/continue with github/i));
    expect(mockSignIn).toHaveBeenCalledWith("github", expect.any(Object));
  });

  // ---------------------------------------------------------------------------
  // Credentials sign-in
  // ---------------------------------------------------------------------------

  it("calls signIn with 'credentials' and form values on submission", async () => {
    render(<SignInPage />);
    const user = userEvent.setup();

    await user.type(await screen.findByPlaceholderText("Email"), "alice@example.com");
    await user.type(await screen.findByPlaceholderText("Password"), "password123");
    await user.click(await screen.findByText(/sign in with email/i));

    expect(mockSignIn).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({ email: "alice@example.com", password: "password123" }),
    );
  });

  // ---------------------------------------------------------------------------
  // URL param banners
  // ---------------------------------------------------------------------------

  it("shows a success banner when the 'registered' param is present", async () => {
    mockSearchParams = new URLSearchParams("registered=true");
    render(<SignInPage />);
    expect(await screen.findByText(/account created/i)).toBeInTheDocument();
  });

  it("shows an error banner when the 'error' param is present", async () => {
    mockSearchParams = new URLSearchParams("error=OAuthSignin");
    render(<SignInPage />);
    expect(await screen.findByText(/sign in failed/i)).toBeInTheDocument();
  });

  it("shows neither banner when no params are present", async () => {
    render(<SignInPage />);
    // Wait for the form to render before asserting absences
    await screen.findByPlaceholderText("Email");
    expect(screen.queryByText(/account created/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sign in failed/i)).not.toBeInTheDocument();
  });
});
