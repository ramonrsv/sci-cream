import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { getLocalStorage, removeLocalStorage, setLocalStorage } from "./local-storage";

// ---------------------------------------------------------------------------
// getLocalStorage
// ---------------------------------------------------------------------------

describe("getLocalStorage", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("returns null when the key is absent", () => {
    expect(getLocalStorage("missing")).toBeNull();
  });

  it("returns a string value", () => {
    localStorage.setItem("k", JSON.stringify("hello"));
    expect(getLocalStorage<string>("k")).toBe("hello");
  });

  it("returns a number value", () => {
    localStorage.setItem("k", JSON.stringify(42));
    expect(getLocalStorage<number>("k")).toBe(42);
  });

  it("returns an object value", () => {
    localStorage.setItem("k", JSON.stringify({ x: 1, y: "two" }));
    expect(getLocalStorage<{ x: number; y: string }>("k")).toEqual({ x: 1, y: "two" });
  });

  it("returns an array value", () => {
    localStorage.setItem("k", JSON.stringify(["a", "b", "c"]));
    expect(getLocalStorage<string[]>("k")).toEqual(["a", "b", "c"]);
  });

  it("returns a boolean value", () => {
    localStorage.setItem("k", JSON.stringify(true));
    expect(getLocalStorage<boolean>("k")).toBe(true);
    localStorage.setItem("k", JSON.stringify(false));
    expect(getLocalStorage<boolean>("k")).toBe(false);
  });

  it("returns null for malformed JSON", () => {
    localStorage.setItem("k", "not-valid-json{{{");
    expect(getLocalStorage("k")).toBeNull();
  });

  it("returns null when window is undefined (SSR)", () => {
    vi.stubGlobal("window", undefined);
    expect(getLocalStorage("k")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// setLocalStorage
// ---------------------------------------------------------------------------

describe("setLocalStorage", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("stores a string value", () => {
    setLocalStorage("k", "hello");
    expect(localStorage.getItem("k")).toBe(JSON.stringify("hello"));
  });

  it("stores a number value", () => {
    setLocalStorage("k", 42);
    expect(localStorage.getItem("k")).toBe(JSON.stringify(42));
  });

  it("stores an object value", () => {
    setLocalStorage("k", { x: 1, y: "two" });
    expect(localStorage.getItem("k")).toBe(JSON.stringify({ x: 1, y: "two" }));
  });

  it("stores an array value", () => {
    setLocalStorage("k", ["a", "b", "c"]);
    expect(localStorage.getItem("k")).toBe(JSON.stringify(["a", "b", "c"]));
  });

  it("stores a boolean value", () => {
    setLocalStorage("k", true);
    expect(localStorage.getItem("k")).toBe(JSON.stringify(true));
    setLocalStorage("k", false);
    expect(localStorage.getItem("k")).toBe(JSON.stringify(false));
  });

  it("does nothing when window is undefined (SSR)", () => {
    vi.stubGlobal("window", undefined);
    setLocalStorage("k", "hello");
    vi.unstubAllGlobals();
    expect(localStorage.getItem("k")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// removeLocalStorage
// ---------------------------------------------------------------------------

describe("removeLocalStorage", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("removes an existing key", () => {
    localStorage.setItem("k", JSON.stringify("hello"));
    removeLocalStorage("k");
    expect(localStorage.getItem("k")).toBeNull();
  });

  it("is a no-op when the key is absent", () => {
    expect(() => removeLocalStorage("missing")).not.toThrow();
    expect(localStorage.getItem("missing")).toBeNull();
  });

  it("does nothing when window is undefined (SSR)", () => {
    localStorage.setItem("k", JSON.stringify("hello"));
    vi.stubGlobal("window", undefined);
    removeLocalStorage("k");
    vi.unstubAllGlobals();
    expect(localStorage.getItem("k")).toBe(JSON.stringify("hello"));
  });
});
