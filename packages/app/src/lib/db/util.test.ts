import { describe, it, expect, vi, afterEach } from "vitest";

import { getDatabaseUrl } from "./util";

// ---------------------------------------------------------------------------
// getDatabaseUrl
// ---------------------------------------------------------------------------

describe("getDatabaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("replaces sslmode=require with sslmode=no-verify", () => {
    vi.stubEnv("POSTGRES_URL", "postgresql://user:pass@host:5432/db?sslmode=require");
    expect(getDatabaseUrl()).toBe("postgresql://user:pass@host:5432/db?sslmode=no-verify");
  });

  it("returns the URL unchanged when sslmode=require is not present", () => {
    vi.stubEnv("POSTGRES_URL", "postgresql://user:pass@host:5432/db?sslmode=prefer");
    expect(getDatabaseUrl()).toBe("postgresql://user:pass@host:5432/db?sslmode=prefer");
  });

  it("only replaces sslmode=require, not other sslmode values", () => {
    vi.stubEnv("POSTGRES_URL", "postgresql://user:pass@host:5432/db?sslmode=verify-full");
    expect(getDatabaseUrl()).toBe("postgresql://user:pass@host:5432/db?sslmode=verify-full");
  });

  it("handles URLs without query parameters", () => {
    vi.stubEnv("POSTGRES_URL", "postgresql://user:pass@host:5432/db");
    expect(getDatabaseUrl()).toBe("postgresql://user:pass@host:5432/db");
  });
});
