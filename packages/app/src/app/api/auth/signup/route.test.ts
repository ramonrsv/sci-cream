import "@testing-library/jest-dom/vitest";

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/data", () => ({ findUserByEmail: vi.fn(), insertUser: vi.fn() }));

vi.mock("bcryptjs", () => ({ hash: vi.fn().mockResolvedValue("hashed-password") }));

import { POST } from "./route";
import { findUserByEmail, insertUser } from "@/lib/data";
import { hash } from "bcryptjs";

const mockFindUser = vi.mocked(findUserByEmail);
const mockInsertUser = vi.mocked(insertUser);
const mockHash = vi.mocked(hash);

/** Helper function to create a Request object with the given body for testing the POST handler */
function makeRequest(body: object) {
  return new Request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindUser.mockImplementation(() => Promise.resolve(undefined));
    mockHash.mockImplementation(() => Promise.resolve("hashed-password"));
  });

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  it("returns 400 when name is missing", async () => {
    const res = await POST(makeRequest({ email: "a@b.com", password: "password123" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/are required/i);
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(makeRequest({ name: "Alice", password: "password123" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/are required/i);
  });

  it("returns 400 when password is missing", async () => {
    const res = await POST(makeRequest({ name: "Alice", email: "a@b.com" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/are required/i);
  });

  it("returns 400 when password is shorter than 8 characters", async () => {
    const res = await POST(makeRequest({ name: "Alice", email: "a@b.com", password: "short" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/8 characters/i);
  });

  // ---------------------------------------------------------------------------
  // Conflicts
  // ---------------------------------------------------------------------------

  it("returns 409 when the email is already registered", async () => {
    mockFindUser.mockResolvedValue({
      id: 1,
      name: "Existing",
      email: "a@b.com",
      passwordHash: null,
      createdAt: new Date(),
    });

    const res = await POST(
      makeRequest({ name: "Alice", email: "a@b.com", password: "password123" }),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already exists/i);
  });

  it("does not call insertUser when the email is already registered", async () => {
    mockFindUser.mockResolvedValue({
      id: 1,
      name: "Existing",
      email: "a@b.com",
      passwordHash: null,
      createdAt: new Date(),
    });

    await POST(makeRequest({ name: "Alice", email: "a@b.com", password: "password123" }));
    expect(mockInsertUser).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Success
  // ---------------------------------------------------------------------------

  it("returns 201 on success", async () => {
    const res = await POST(
      makeRequest({ name: "Alice", email: "a@b.com", password: "password123" }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("hashes the password with cost factor 12", async () => {
    await POST(makeRequest({ name: "Alice", email: "a@b.com", password: "password123" }));
    expect(mockHash).toHaveBeenCalledWith("password123", 12);
  });

  it("calls insertUser with the hashed password", async () => {
    await POST(makeRequest({ name: "Alice", email: "a@b.com", password: "password123" }));
    expect(mockInsertUser).toHaveBeenCalledWith({
      name: "Alice",
      email: "a@b.com",
      passwordHash: "hashed-password",
    });
  });

  it("does not store the plain-text password", async () => {
    await POST(makeRequest({ name: "Alice", email: "a@b.com", password: "password123" }));
    const call = mockInsertUser.mock.calls[0]?.[0];
    expect(call).not.toHaveProperty("password");
    expect(call?.passwordHash).not.toBe("password123");
  });
});
