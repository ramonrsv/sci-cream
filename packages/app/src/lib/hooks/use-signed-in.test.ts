import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

import { useSession } from "next-auth/react";
import { useSignedIn } from "./use-signed-in";

vi.mock("next-auth/react", () => ({ useSession: vi.fn() }));

/** Report the given session status, with the `data` NextAuth pairs with it. */
function stubSession(status: "authenticated" | "unauthenticated" | "loading") {
  vi.mocked(useSession).mockReturnValue(
    status === "authenticated"
      ? { data: { user: { email: "a@b.c" }, expires: "" }, status, update: vi.fn() }
      : { data: null, status, update: vi.fn() },
  );
}

describe("useSignedIn", () => {
  it("is true once a session is established", () => {
    stubSession("authenticated");
    const { result } = renderHook(() => useSignedIn());
    expect(result.current).toBe(true);
  });

  it("is false with no session", () => {
    stubSession("unauthenticated");
    const { result } = renderHook(() => useSignedIn());
    expect(result.current).toBe(false);
  });

  // Gated controls stay disabled until the session resolves, rather than flickering enabled.
  it("is false while the session is still loading", () => {
    stubSession("loading");
    const { result } = renderHook(() => useSignedIn());
    expect(result.current).toBe(false);
  });
});
